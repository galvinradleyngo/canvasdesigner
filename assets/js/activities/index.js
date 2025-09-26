import { flipCards } from './flipCards.js';
import { dragDrop } from './dragDrop.js';
import { hotspots } from './hotspots.js';

export const activities = {
  [flipCards.id]: flipCards,
  [dragDrop.id]: dragDrop,
  [hotspots.id]: hotspots
};

export const defaultActivityId = flipCards.id;
