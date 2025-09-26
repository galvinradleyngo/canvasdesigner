import { flipCards } from './flipCards.js';
import { accordions } from './accordions.js';
import { hotspots } from './hotspots.js';
import { dragDrop } from './dragDrop.js';

export const activities = {
  [flipCards.id]: flipCards,
  [accordions.id]: accordions,
  [hotspots.id]: hotspots,
  [dragDrop.id]: dragDrop
};

export const defaultActivityId = flipCards.id;
