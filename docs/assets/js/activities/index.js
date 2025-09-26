import { flipCards } from './flipCards.js';
import { dragDrop } from './dragDrop.js';
import { hotspots } from './hotspots.js';
import { accordion } from './accordion.js';
import { timeline } from './timeline.js';
import { branchingScenarios } from './branchingScenarios.js';
import { imageCarousel } from './imageCarousel.js';

export const activities = {
  [flipCards.id]: flipCards,
  [dragDrop.id]: dragDrop,
  [hotspots.id]: hotspots,
  [accordion.id]: accordion,
  [timeline.id]: timeline,
  [branchingScenarios.id]: branchingScenarios,
  [imageCarousel.id]: imageCarousel
};

export const defaultActivityId = flipCards.id;
