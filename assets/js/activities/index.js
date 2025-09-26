import { flipCards } from './flipCards.js';
import { accordions } from './accordions.js';
import { hotspots } from './hotspots.js';
import { dragdrop } from './dragdrop.js';

export const activities = {
  [flipCards.id]: flipCards,
  [accordions.id]: accordions,
  [hotspots.id]: hotspots,
  [dragdrop.id]: dragdrop
};

export const defaultActivityId = flipCards.id;
