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

  /**
   * Genera y guarda una serie de lotería en Firestore.
   */
  async generateAndSaveSeries(
    ticketTitle: string,
    ticketDescription: string,
    date: string,
    contact: string,
    opportunities: number | null,
    figures: number | null,
    fontColors: FontColors,
    ticketBackground: string,
    ticketLogo: boolean,
    gracePeriodValue: number | null,
    gracePeriodUnit: string,
    startRectAreaY: number,
    endRectAreaY: number
  ): Promise<string> {
    const totalNumbers = this.generateNumbers(figures!);
    let tickets: Ticket[];

    if (opportunities! <= 5) {
      tickets = this.groupNumbersIntoTickets(totalNumbers, opportunities!);
    } else {
      tickets = this.generateOptimizedTickets(totalNumbers, opportunities!);
    }

    this.shuffleTickets(tickets, opportunities!);

    this.series = {
      date,
      ticketTitle,
      ticketDescription,
      contact,
      opportunities,
      figures,
      tickets,
      fontColors,
      ticketBackground,
      ticketLogo,
      gracePeriodValue,
      gracePeriodUnit,
      startRectAreaY,
      endRectAreaY,
    };

    try {
      const seriesId = await this.firestoreService.saveSeries(this.series);
      return seriesId;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Retorna la serie generada actualmente.
   */
  getSeries(): LotterySeries | null {
    return this.series;
  }

  /**
   * Genera todos los números posibles con la cantidad de cifras dada.
   */
  private generateNumbers(figures: number): string[] {
    const total = Math.pow(10, figures);
    return Array.from({ length: total }, (_, i) =>
      i.toString().padStart(figures, '0')
    );
  }

  /**
   * Mezcla aleatoriamente los elementos de un array (Fisher-Yates).
   */
  private shuffleArray(array: string[]) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * Agrupa números en boletos con primeros dígitos únicos (para ≤ 5 oportunidades).
   */
  private groupNumbersIntoTickets(
    numbers: string[],
    opportunities: number
  ): Ticket[] {
    const tickets: Ticket[] = [];
    const groupedNumbers: { [key: string]: string[] } = {};

    for (const num of numbers) {
      const firstDigit = num[0];
      if (!groupedNumbers[firstDigit]) groupedNumbers[firstDigit] = [];
      groupedNumbers[firstDigit].push(num);
    }

    Object.values(groupedNumbers).forEach((group) => this.shuffleArray(group));

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

      usedKeys.forEach((key) => {
        if (groupedNumbers[key]?.length === 0) delete groupedNumbers[key];
      });

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

  /**
   * Genera boletos optimizados (para > 5 oportunidades), buscando diversidad de primeros dígitos.
   */
  private generateOptimizedTickets(
    numbers: string[],
    opportunities: number
  ): Ticket[] {
    const tickets: Ticket[] = [];
    let availableNumbers = [...numbers];
    this.shuffleArray(availableNumbers);

    while (availableNumbers.length >= opportunities) {
      const selectedNumbers = new Set<string>();
      const ticketNumbers: string[] = [];

      for (const num of availableNumbers) {
        if (!selectedNumbers.has(num[0])) {
          selectedNumbers.add(num[0]);
          ticketNumbers.push(num);
        }
        if (ticketNumbers.length === opportunities) break;
      }

      if (ticketNumbers.length === opportunities) {
        tickets.push({
          id: crypto.randomUUID(),
          numbers: ticketNumbers,
          printed: false,
        });
        availableNumbers = availableNumbers.filter(
          (n) => !ticketNumbers.includes(n)
        );
      } else {
        break;
      }
    }

    return tickets;
  }

  /**
   * Intercambia números aleatoriamente entre boletos sin repetir primeros dígitos.
   */
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

      if (
        this.isValidSwap(ticketA.numbers, numA, numB) &&
        this.isValidSwap(ticketB.numbers, numB, numA)
      ) {
        ticketA.numbers[numAIndex] = numB;
        ticketB.numbers[numBIndex] = numA;
      }
    }
  }

  /**
   * Verifica que el intercambio mantiene la unicidad de primeros dígitos.
   */
  private isValidSwap(
    ticketNumbers: string[],
    oldNum: string,
    newNum: string
  ): boolean {
    if (!oldNum || !newNum) return false;
    const tempNumbers = ticketNumbers.map((n) => (n === oldNum ? newNum : n));
    const uniqueFirstDigits = new Set(tempNumbers.map((n) => n[0]));
    return uniqueFirstDigits.size === tempNumbers.length;
  }
}
