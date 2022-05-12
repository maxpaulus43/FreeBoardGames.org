const Thumbnail = require('./media/thumbnail.png?lqip-colors');
import { GameMode } from 'gamesShared/definitions/mode';
import { IGameDef, IGameStatus } from 'gamesShared/definitions/game';
import instructions from './instructions.md';

export const fooBarGameDef: IGameDef = {
  code: 'chinchon',
  name: 'Chinchon',
  contributors: ['maxpaulus43'],
  imageURL: Thumbnail,
  modes: [{ mode: GameMode.OnlineFriend }],
  minPlayers: 2,
  maxPlayers: 4,
  description: 'Multiplayer online card game similar to gin rummy.',
  descriptionTag: `chinchon multiplayer card game chincón`,
  instructions: {
    text: instructions,
  },
  status: IGameStatus.PUBLISHED,
  config: () => import('./config'),
};

export default fooBarGameDef;
