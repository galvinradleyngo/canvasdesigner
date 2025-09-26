import { flipCards } from './flipCards.js';
import { dragDrop } from './dragDrop.js';
import { hotspots } from './hotspots.js';
import { accordion } from './accordion.js';
import { timeline } from './timeline.js';

export const activities = {
  [flipCards.id]: flipCards,
  [dragDrop.id]: dragDrop,
  [hotspots.id]: hotspots,
  [accordion.id]: accordion,
  [timeline.id]: timeline
};

export const defaultActivityId = flipCards.id;
