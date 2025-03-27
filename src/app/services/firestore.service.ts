import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  getDoc,
  doc,
  getDocs,
  writeBatch,
  updateDoc,
} from '@angular/fire/firestore';
import { PrintBatch } from '../models/models';

// Interfaces de datos
interface Ticket {
  id?: string;
  numbers: string[];
  printed: boolean;
}

interface LotterySeries {
  id?: string;
  title: string;
  price: number;
  date: string;
  opportunities: number;
  figures: number;
  tickets: Ticket[];
  totalTickets?: number;
  printedTickets?: number;
  availableTickets?: number;
}

// Funciones para codificar/decodificar datos en Base64
const encodeBase64 = (data: object): string =>
  btoa(unescape(encodeURIComponent(JSON.stringify(data))));

const decodeBase64 = (data: string): any =>
  JSON.parse(decodeURIComponent(escape(atob(data))));

@Injectable({
  providedIn: 'root',
})
export class FirestoreService {
  constructor(private firestore: Firestore) {}

  /**
   * Guarda una serie en Firestore y retorna su ID.
   */
  async saveSeries(series: LotterySeries): Promise<string> {
    if (!series || !series.tickets.length) {
      throw new Error('Error: La serie o los boletos están vacíos.');
    }

    const seriesRef = collection(this.firestore, 'series');
    const seriesDoc = await addDoc(seriesRef, {
      title: series.title,
      price: series.price,
      date: series.date,
      opportunities: series.opportunities,
      figures: series.figures,
      totalTickets: series.tickets.length,
      printedTickets: 0,
      availableTickets: series.tickets.length,
    });

    const seriesId = seriesDoc.id;
    const chunkSize = 5000;

    for (let i = 0; i < series.tickets.length; i += chunkSize) {
      const ticketChunk = series.tickets.slice(i, i + chunkSize);
      const ticketDocRef = doc(
        this.firestore,
        `series/${seriesId}/ticketChunks/${Math.floor(i / chunkSize)}`
      );

      const batch = writeBatch(this.firestore);
      batch.set(ticketDocRef, { ticketsBase64: encodeBase64(ticketChunk) });

      try {
        await batch.commit();
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return seriesId;
  }

  /**
   * Obtiene la información básica de una serie específica por su ID.
   */
  async getSeriesById(id: string): Promise<LotterySeries | null> {
    if (!id) return null;

    const docRef = doc(this.firestore, `series/${id}`);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    const data = docSnap.data();

    return {
      id,
      title: data['title'] || '',
      price: data['price'] || 0,
      date: data['date'] || '',
      opportunities: data['opportunities'] || 0,
      figures: data['figures'] || 0,
      tickets: [],
      totalTickets: data['totalTickets'] ?? 0,
      printedTickets: data['printedTickets'] ?? 0,
      availableTickets: data['availableTickets'] ?? data['totalTickets'] ?? 0,
    };
  }

  /**
   * Obtiene todas las series almacenadas en Firestore.
   */
  async getAllSeries(): Promise<LotterySeries[]> {
    const seriesCollection = collection(this.firestore, 'series');
    const seriesSnapshot = await getDocs(seriesCollection);

    return seriesSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data['title'] || '',
        price: data['price'] || 0,
        date: data['date'] || '',
        opportunities: data['opportunities'] || 0,
        figures: data['figures'] || 0,
        totalTickets: data['totalTickets'] ?? 0,
        printedTickets: data['printedTickets'] ?? 0,
        availableTickets: data['availableTickets'] ?? data['totalTickets'] ?? 0,
        tickets: [],
      };
    });
  }

  /**
   * Registra una nueva tanda de boletos impresos en Firestore.
   */

  async registerPrintBatch(
    seriesId: string,
    startIndex: number,
    endIndex: number,
    ticketIds: string[]
  ): Promise<void> {
    if (!seriesId)
      throw new Error('Error: No se proporcionó el ID de la serie.');

    const printBatchesRef = collection(
      this.firestore,
      `series/${seriesId}/print_batches`
    );

    await addDoc(printBatchesRef, {
      startIndex,
      endIndex,
      ticketIds, // Guardamos los IDs exactos de los boletos
      printedAt: new Date().toISOString(),
    });

    // Actualizar los contadores de la serie
    const seriesRef = doc(this.firestore, `series/${seriesId}`);
    const seriesSnap = await getDoc(seriesRef);
    if (!seriesSnap.exists()) return;

    const seriesData = seriesSnap.data();
    const newPrintedCount =
      (seriesData['printedTickets'] ?? 0) + ticketIds.length;

    await updateDoc(seriesRef, {
      printedTickets: newPrintedCount,
      availableTickets: (seriesData['totalTickets'] ?? 0) - newPrintedCount,
    });
  }

  /**
   * Obtiene el último índice de boleto impreso.
   */
  async getLastPrintedIndex(seriesId: string): Promise<number> {
    if (!seriesId) return 0;

    const printBatchesRef = collection(
      this.firestore,
      `series/${seriesId}/print_batches`
    );
    const snapshot = await getDocs(printBatchesRef);

    if (snapshot.empty) return 0; // No hay boletos impresos

    // Buscamos el índice más alto de los boletos impresos
    let lastIndex = 0;
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data['endIndex'] > lastIndex) {
        lastIndex = data['endIndex'];
      }
    });

    return lastIndex;
  }

  async getTickets(seriesId: string): Promise<Ticket[]> {
    if (!seriesId) return [];

    const ticketChunksRef = collection(
      this.firestore,
      `series/${seriesId}/ticketChunks`
    );
    const ticketChunksSnapshot = await getDocs(ticketChunksRef);

    let tickets: Ticket[] = [];
    ticketChunksSnapshot.forEach((doc) => {
      tickets = tickets.concat(decodeBase64(doc.data()['ticketsBase64']));
    });

    return tickets;
  }

  /**
   * Obtiene todas las tandas de boletos impresos de una serie.
   */
  async getPrintBatches(seriesId: string): Promise<PrintBatch[]> {
    if (!seriesId) return [];

    const printBatchesRef = collection(
      this.firestore,
      `series/${seriesId}/print_batches`
    );
    const snapshot = await getDocs(printBatchesRef);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      startIndex: doc.data()['startIndex'],
      endIndex: doc.data()['endIndex'],
      printedAt: doc.data()['printedAt'],
      ticketIds: doc.data()['ticketIds'] ?? [],
    }));
  }
}
