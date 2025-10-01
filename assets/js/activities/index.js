import { flipCards } from './flipCards.js';
import { dragDrop } from './dragDrop.js';
import { hotspots } from './hotspots.js';
import { accordion } from './accordion.js';
import { timeline } from './timeline.js';
import { branchingScenarios } from './branchingScenarios.js';
import { imageCarousel } from './imageCarousel.js';
import { immersiveText } from './immersiveText.js';
import { wordCloud } from './wordCloud.js';
import { debate } from './debate.js';
import { captionThis } from './captionThis.js';
import { exampleNonExample } from './exampleNonExample.js';

export const activities = {
  [flipCards.id]: flipCards,
  [dragDrop.id]: dragDrop,
  [hotspots.id]: hotspots,
  [accordion.id]: accordion,
  [timeline.id]: timeline,
  [branchingScenarios.id]: branchingScenarios,
  [imageCarousel.id]: imageCarousel,
  [immersiveText.id]: immersiveText,
  [wordCloud.id]: wordCloud,
  [debate.id]: debate,
  [captionThis.id]: captionThis,
  [exampleNonExample.id]: exampleNonExample
};

export const defaultActivityId = flipCards.id;
