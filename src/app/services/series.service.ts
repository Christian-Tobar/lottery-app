import { Injectable } from '@angular/core';
import { FirestoreService } from './firestore.service';

interface Ticket {
  id: string;
  numbers: string[];
  printed: boolean;
}

interface LotterySeries {
  id?: string; // Firestore generará el ID
  title: string;
  price: number;
  date: string;
  opportunities: number;
  figures: number;
  tickets: Ticket[];
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
    title: string,
    price: number,
    date: string,
    opportunities: number,
    figures: number
  ): Promise<string> {
    const totalNumbers = this.generateNumbers(figures);
    let tickets: Ticket[];

    if (opportunities <= 5) {
      tickets = this.groupNumbersIntoTickets(totalNumbers, opportunities);
    } else {
      tickets = this.generateOptimizedTickets(totalNumbers, opportunities);
    }

    this.shuffleTickets(tickets, opportunities);

    this.series = { title, price, date, opportunities, figures, tickets };

    try {
      const seriesId = await this.firestoreService.saveSeries(this.series);
      console.log('Serie guardada en Firestore con ID:', seriesId);
      return seriesId;
    } catch (error) {
      console.error('Error al guardar la serie:', error);
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
   * Mezcla aleatoriamente los elementos de un array usando el algoritmo Fisher-Yates.
   */
  private shuffleArray(array: string[]) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * Agrupa los números en boletos asegurando que cada número en un boleto tenga un primer dígito único.
   * Se usa para oportunidades menores o iguales a 5.
   */
  private groupNumbersIntoTickets(
    numbers: string[],
    opportunities: number
  ): Ticket[] {
    let tickets: Ticket[] = [];
    let groupedNumbers: { [key: string]: string[] } = {};

    for (let num of numbers) {
      let firstDigit = num[0];
      if (!groupedNumbers[firstDigit]) groupedNumbers[firstDigit] = [];
      groupedNumbers[firstDigit].push(num);
    }

    Object.values(groupedNumbers).forEach((group) => this.shuffleArray(group));

    while (Object.keys(groupedNumbers).length >= opportunities) {
      let selectedNumbers: string[] = [];
      let usedKeys = new Set<string>();

      for (let key of Object.keys(groupedNumbers)) {
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
   * Genera boletos asegurando diversidad de primeros dígitos cuando hay muchas oportunidades.
   * Se usa para oportunidades mayores a 5.
   */
  private generateOptimizedTickets(
    numbers: string[],
    opportunities: number
  ): Ticket[] {
    let tickets: Ticket[] = [];
    let availableNumbers = [...numbers];
    this.shuffleArray(availableNumbers);

    while (availableNumbers.length >= opportunities) {
      let selectedNumbers = new Set<string>();
      let ticketNumbers: string[] = [];

      for (let i = 0; i < availableNumbers.length; i++) {
        let num = availableNumbers[i];
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
   * Intercambia números aleatoriamente entre boletos sin romper la restricción de primeros dígitos únicos.
   */
  private shuffleTickets(tickets: Ticket[], opportunities: number) {
    for (let i = 0; i < tickets.length * opportunities * 2; i++) {
      let ticketAIndex = Math.floor(Math.random() * tickets.length);
      let ticketBIndex = Math.floor(Math.random() * tickets.length);
      if (ticketAIndex === ticketBIndex) continue;

      let ticketA = tickets[ticketAIndex];
      let ticketB = tickets[ticketBIndex];

      let numAIndex = Math.floor(Math.random() * opportunities);
      let numBIndex = Math.floor(Math.random() * opportunities);

      let numA = ticketA.numbers[numAIndex];
      let numB = ticketB.numbers[numBIndex];

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
   * Verifica si un intercambio de números en un boleto sigue cumpliendo la restricción de primeros dígitos únicos.
   */
  private isValidSwap(
    ticketNumbers: string[],
    oldNum: string,
    newNum: string
  ): boolean {
    if (!oldNum || !newNum) return false;
    let tempNumbers = ticketNumbers.map((n) => (n === oldNum ? newNum : n));
    let uniqueFirstDigits = new Set(tempNumbers.map((n) => n[0]));
    return uniqueFirstDigits.size === tempNumbers.length;
  }
}
