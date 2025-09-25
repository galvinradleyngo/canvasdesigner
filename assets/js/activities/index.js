import { flipCards } from './flipCards.js';
import { accordions } from './accordions.js';
import { hotspots } from './hotspots.js';

export const activities = {
  [flipCards.id]: flipCards,
  [accordions.id]: accordions,
  [hotspots.id]: hotspots
};

export const defaultActivityId = flipCards.id;
