import { Injectable, inject } from '@angular/core';
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
import { LotterySeries, PrintBatch } from '../models/models';

// INTERFACES INTERNAS
interface Ticket {
  id?: string;
  numbers: string[];
  printed: boolean;
}

// FUNCIONES UTILITARIAS PARA CODIFICACIÓN BASE64
const encodeBase64 = (data: object): string =>
  btoa(unescape(encodeURIComponent(JSON.stringify(data))));

const decodeBase64 = (data: string): any =>
  JSON.parse(decodeURIComponent(escape(atob(data))));

@Injectable({
  providedIn: 'root',
})
export class FirestoreService {
  private firestore = inject(Firestore);

  // GUARDA UNA NUEVA SERIE EN FIRESTORE Y FRAGMENTA SUS BOLETOS EN CHUNKS
  async saveSeries(series: LotterySeries): Promise<string> {
    if (!series || !series.tickets.length) {
      throw new Error('Error: La serie o los boletos están vacíos.');
    }

    const seriesRef = collection(this.firestore, 'series');

    // Registro principal de la serie
    const seriesDoc = await addDoc(seriesRef, {
      ticketTitle: series.ticketTitle,
      ticketDescription: series.ticketDescription,
      date: series.date,
      contact: series.contact,
      opportunities: series.opportunities,
      figures: series.figures,
      totalTickets: series.tickets.length,
      printedTickets: 0,
      availableTickets: series.tickets.length,
      selectedColor: series.selectedColor,
      ticketBackground: series.ticketBackground,
      ticketLogo: series.ticketLogo,
      gracePeriodValue: series.gracePeriodValue,
      gracePeriodUnit: series.gracePeriodUnit,
      startRectAreaY: series.startRectAreaY,
      endRectAreaY: series.endRectAreaY,
      createdAt: new Date().toISOString(),
    });

    const seriesId = seriesDoc.id;
    const chunkSize = 5000; // Tamaño de fragmento para los boletos

    for (let i = 0; i < series.tickets.length; i += chunkSize) {
      const ticketChunk = series.tickets.slice(i, i + chunkSize);

      // Referencia al documento del chunk
      const ticketDocRef = doc(
        this.firestore,
        `series/${seriesId}/ticketChunks/${Math.floor(i / chunkSize)}`
      );

      // Escritura por lote del chunk codificado
      const batch = writeBatch(this.firestore);
      batch.set(ticketDocRef, { ticketsBase64: encodeBase64(ticketChunk) });

      try {
        await batch.commit();
      } catch {
        // En caso de error, espera unos segundos antes de continuar
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      // Pausa entre commits para evitar sobrecarga
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return seriesId;
  }

  // OBTIENE LA INFORMACIÓN DETALLADA DE UNA SERIE POR SU ID
  async getSeriesById(id: string): Promise<LotterySeries | null> {
    if (!id) return null;

    const docRef = doc(this.firestore, `series/${id}`);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    const data = docSnap.data();

    return {
      id,
      date: data['date'] || '',
      ticketTitle: data['ticketTitle'] || '',
      ticketDescription: data['ticketDescription'] || '',
      contact: data['contact'] || '',
      opportunities: data['opportunities'] || 0,
      figures: data['figures'] || 0,
      tickets: [], // Los boletos se recuperan por separado
      selectedColor: data['selectedColor'] || '',
      ticketBackground: data['ticketBackground'] || '',
      totalTickets: data['totalTickets'] ?? 0,
      printedTickets: data['printedTickets'] ?? 0,
      availableTickets: data['availableTickets'] ?? data['totalTickets'] ?? 0,
      gracePeriodValue: data['gracePeriodValue'] ?? null,
      gracePeriodUnit: data['gracePeriodUnit'] ?? null,
      ticketLogo: data['ticketLogo'] || false,
      startRectAreaY: data['startRectAreaY'] ?? 0,
      endRectAreaY: data['endRectAreaY'] ?? 0,
      createdAt: data['createdAt'] || null,
    };
  }

  // OBTIENE TODAS LAS SERIES DISPONIBLES EN FIRESTORE
  async getAllSeries(): Promise<LotterySeries[]> {
    const seriesCollection = collection(this.firestore, 'series');
    const seriesSnapshot = await getDocs(seriesCollection);

    return seriesSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        date: data['date'] || '',
        ticketTitle: data['ticketTitle'] || '',
        ticketDescription: data['ticketDescription'] || '',
        contact: data['contact'] || '',
        opportunities: data['opportunities'] || 0,
        figures: data['figures'] || 0,
        tickets: [],
        selectedColor: data['selectedColor'] || '',
        ticketBackground: data['ticketBackground'] || '',
        totalTickets: data['totalTickets'] ?? 0,
        printedTickets: data['printedTickets'] ?? 0,
        availableTickets: data['availableTickets'] ?? data['totalTickets'] ?? 0,
        gracePeriodValue: data['gracePeriodValue'] ?? null,
        gracePeriodUnit: data['gracePeriodUnit'] ?? null,
        ticketLogo: data['ticketLogo'] || false,
        startRectAreaY: data['startRectAreaY'] ?? 0,
        endRectAreaY: data['endRectAreaY'] ?? 0,
        createdAt: data['createdAt'] || null,
      };
    });
  }

  // REGISTRA UNA NUEVA TANDA DE IMPRESIÓN Y ACTUALIZA ESTADÍSTICAS DE LA SERIE
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

    // Registro de la tanda de impresión
    await addDoc(printBatchesRef, {
      startIndex,
      endIndex,
      ticketIds,
      printedAt: new Date().toISOString(),
    });

    // Actualizar contadores de boletos impresos
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

  // DEVUELVE EL ÍNDICE MÁS ALTO DE BOLETO IMPRESO EN UNA SERIE
  async getLastPrintedIndex(seriesId: string): Promise<number> {
    if (!seriesId) return 0;

    const printBatchesRef = collection(
      this.firestore,
      `series/${seriesId}/print_batches`
    );
    const snapshot = await getDocs(printBatchesRef);

    if (snapshot.empty) return 0;

    let lastIndex = 0;
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data['endIndex'] > lastIndex) {
        lastIndex = data['endIndex'];
      }
    });

    return lastIndex;
  }

  // OBTIENE TODOS LOS BOLETOS DE UNA SERIE, DECODEADOS DESDE BASE64
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

  // OBTIENE TODAS LAS TANDAS DE IMPRESIÓN DE UNA SERIE
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
