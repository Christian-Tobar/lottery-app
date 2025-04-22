import { Injectable } from '@angular/core';
import { FirestoreService } from './firestore.service';
import { FontColors, LotterySeries } from '../models/models';

interface Ticket {
  id: string;
  numbers: string[];
  printed: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SeriesService {
  private series: LotterySeries | null = null;

  constructor(private firestoreService: FirestoreService) {}

  // Genera una nueva serie de lotería y la guarda en Firestore
  async generateAndSaveSeries(
    ticketTitle: string,
    ticketDescription: string,
    date: string,
    contact: string,
    opportunities: number | null,
    figures: number | null,
    fontColors: FontColors,
    ticketBackground: string,
    ticketBackBackground: string,
    ticketLogo: boolean,
    ticketClause: string,
    gracePeriodValue: number | null,
    gracePeriodUnit: string,
    startRectAreaY: number,
    endRectAreaY: number
  ): Promise<string> {
    // Genera todos los números posibles según las cifras
    const totalNumbers = this.generateNumbers(figures!);
    let tickets: Ticket[];

    // Si hay pocas oportunidades, agrupa por primer dígito
    if (opportunities! <= 5) {
      tickets = this.groupNumbersIntoTickets(totalNumbers, opportunities!);
    } else {
      // Si hay muchas oportunidades, usa generación optimizada
      tickets = await this.generateOptimizedTickets(
        totalNumbers,
        opportunities!
      );
    }

    // Mezcla los números entre los boletos
    this.shuffleTickets(tickets, opportunities!);

    // Crea el objeto de la serie
    this.series = {
      status: 'Activa',
      date,
      ticketTitle,
      ticketDescription,
      contact,
      opportunities,
      figures,
      tickets,
      fontColors,
      ticketBackground,
      ticketBackBackground,
      ticketLogo,
      ticketClause,
      gracePeriodValue,
      gracePeriodUnit,
      startRectAreaY,
      endRectAreaY,
    };

    try {
      // Guarda la serie en Firestore y retorna su ID
      const seriesId = await this.firestoreService.saveSeries(this.series);
      return seriesId;
    } catch (error) {
      throw error;
    }
  }

  // Devuelve la serie generada actualmente
  getSeries(): LotterySeries | null {
    return this.series;
  }

  // Genera todos los números posibles con la cantidad de cifras indicada
  private generateNumbers(figures: number): string[] {
    const total = Math.pow(10, figures);
    return Array.from({ length: total }, (_, i) =>
      i.toString().padStart(figures, '0')
    );
  }

  // Mezcla aleatoriamente los elementos de un array (algoritmo Fisher-Yates)
  private shuffleArray(array: string[]) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // Agrupa los números en boletos con primeros dígitos únicos (cuando hay pocas oportunidades)
  private groupNumbersIntoTickets(
    numbers: string[],
    opportunities: number
  ): Ticket[] {
    const tickets: Ticket[] = [];
    const groupedNumbers: { [key: string]: string[] } = {};

    // Agrupa los números por el primer dígito
    for (const num of numbers) {
      const firstDigit = num[0];
      if (!groupedNumbers[firstDigit]) groupedNumbers[firstDigit] = [];
      groupedNumbers[firstDigit].push(num);
    }

    // Mezcla cada grupo
    Object.values(groupedNumbers).forEach((group) => this.shuffleArray(group));

    // Genera boletos asegurando que los números tengan primeros dígitos únicos
    while (Object.keys(groupedNumbers).length >= opportunities) {
      const selectedNumbers: string[] = [];
      const usedKeys = new Set<string>();

      for (const key of Object.keys(groupedNumbers)) {
        if (
          selectedNumbers.length < opportunities &&
          groupedNumbers[key].length > 0
        ) {
          selectedNumbers.push(groupedNumbers[key].shift()!);
          usedKeys.add(key);
        }
      }

      // Elimina grupos vacíos
      usedKeys.forEach((key) => {
        if (groupedNumbers[key]?.length === 0) delete groupedNumbers[key];
      });

      // Verifica unicidad de primeros dígitos antes de crear el boleto
      if (
        new Set(selectedNumbers.map((n) => n[0])).size ===
        selectedNumbers.length
      ) {
        tickets.push({
          id: crypto.randomUUID(),
          numbers: selectedNumbers,
          printed: false,
        });
      }
    }

    return tickets;
  }

  // Genera boletos optimizados para oportunidades mayores a 5
  private async generateOptimizedTickets(
    numbers: string[],
    opportunities: number
  ): Promise<Ticket[]> {
    const tickets: Ticket[] = [];
    let availableNumbers = [...numbers];
    this.shuffleArray(availableNumbers);

    let iterations = 0;

    // Intenta generar boletos mientras haya suficientes números
    while (availableNumbers.length >= opportunities) {
      const selectedNumbers = new Set<string>();
      const ticketNumbers: string[] = [];

      // Agrega números con primeros dígitos únicos
      for (const num of availableNumbers) {
        if (!selectedNumbers.has(num[0])) {
          selectedNumbers.add(num[0]);
          ticketNumbers.push(num);
        }
        if (ticketNumbers.length === opportunities) break;
      }

      // Si se logró formar un boleto válido, lo agrega
      if (ticketNumbers.length === opportunities) {
        tickets.push({
          id: crypto.randomUUID(),
          numbers: ticketNumbers,
          printed: false,
        });

        // Elimina esos números del conjunto disponible
        const ticketSet = new Set(ticketNumbers);
        availableNumbers = availableNumbers.filter((n) => !ticketSet.has(n));
      } else {
        break;
      }

      // Cede el hilo cada 1000 iteraciones para evitar bloqueo en navegador
      if (++iterations % 1000 === 0) {
        await new Promise((resolve) => requestIdleCallback(resolve));
      }
    }

    return tickets;
  }

  // Mezcla aleatoriamente los números entre boletos asegurando unicidad de primeros dígitos
  private shuffleTickets(tickets: Ticket[], opportunities: number) {
    for (let i = 0; i < tickets.length * opportunities * 2; i++) {
      const ticketAIndex = Math.floor(Math.random() * tickets.length);
      const ticketBIndex = Math.floor(Math.random() * tickets.length);
      if (ticketAIndex === ticketBIndex) continue;

      const ticketA = tickets[ticketAIndex];
      const ticketB = tickets[ticketBIndex];

      const numAIndex = Math.floor(Math.random() * opportunities);
      const numBIndex = Math.floor(Math.random() * opportunities);

      const numA = ticketA.numbers[numAIndex];
      const numB = ticketB.numbers[numBIndex];

      // Verifica si es válido intercambiar los números entre boletos
      if (
        this.isValidSwap(ticketA.numbers, numA, numB) &&
        this.isValidSwap(ticketB.numbers, numB, numA)
      ) {
        ticketA.numbers[numAIndex] = numB;
        ticketB.numbers[numBIndex] = numA;
      }
    }
  }

  // Verifica que un intercambio mantenga la unicidad de los primeros dígitos
  private isValidSwap(
    ticketNumbers: string[],
    oldNum: string,
    newNum: string
  ): boolean {
    if (!oldNum || !newNum) return false;

    // Simula el cambio y valida que no se repitan primeros dígitos
    const tempNumbers = ticketNumbers.map((n) => (n === oldNum ? newNum : n));
    const uniqueFirstDigits = new Set(tempNumbers.map((n) => n[0]));
    return uniqueFirstDigits.size === tempNumbers.length;
  }
}
