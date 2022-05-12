import { BoardProps } from 'boardgame.io/react';
import React, { useEffect, useRef, useState } from 'react';
import Button from './Button';
import CardView from './CardView';
import { canMeldWithCard } from './MeldLogic';
import {
  ChinchonCard,
  ChinchonGameState,
  ChinchonPhase,
  ChinchonPlayerState,
  ChinchonStage,
  GameEndState,
} from './Model';
import Sortable from 'sortablejs';
import OpponentHand from './OpponentHand';
import { isAndroid } from './utils';
import EndGameInfo from './EndGameInfo';
import EndRoundInfo from './EndRoundInfo';
import { GameLayout } from 'gamesShared/components/fbg/GameLayout';
import { IGameArgs } from 'gamesShared/definitions/game';

interface ChinchonBoardProps extends BoardProps<ChinchonGameState> {
  gameArgs?: IGameArgs;
}

const ChinchonBoard: React.FC<ChinchonBoardProps> = ({ G, ctx, moves, playerID, gameArgs }) => {
  playerID = playerID!;
  const activePlayers = ctx.activePlayers ?? {};
  const isMyTurn = ctx.currentPlayer === playerID;
  const myPlayer = G.players[playerID];
  const myCards = myPlayer.hand;
  const canDiscard = activePlayers[playerID] === ChinchonStage.Discard;
  const [selectedCard, setSelectedCard] = useState<ChinchonCard>();
  const isEliminated = !playerID || !G.playOrder.includes(playerID);
  const myCardsRef = useRef<HTMLDivElement>(null);
  const shouldReview = activePlayers[playerID] === ChinchonStage.ReviewRound;
  const isGameOver = ctx.gameover as GameEndState;
  const winner = isGameOver && isGameOver.winner;
  const [endGame, setEndGame] = useState('');

  useEffect(() => {
    if (myCardsRef.current) {
      Sortable.create(myCardsRef.current, {
        animation: 100,
        ghostClass: 'opacity-0',
        delay: isAndroid() ? 100 : 0,
      });
    }

    let s = document.createElement('style');
    s.innerHTML = styles;
    document.head.appendChild(s);

    return () => {
      document.head.removeChild(s);
    };
  }, []);

  let roundEndString = undefined;
  if (ctx.phase === ChinchonPhase.Review) {
    roundEndString = 'Waiting on';
    const activePlayerIDs = Object.keys(ctx.activePlayers ?? {});
    if (activePlayerIDs.includes(playerID)) {
      roundEndString += ' You';
      if (activePlayerIDs.length > 1) {
        const plural = activePlayerIDs.length - 1 > 0 ? 's' : '';
        roundEndString += ` and ${activePlayerIDs.length - 1} other player${plural}`;
      }
    } else if (activePlayerIDs.length > 0) {
      const plural = activePlayerIDs.length > 1 ? 's' : '';
      roundEndString += ` ${activePlayerIDs.length} other player${plural}`;
    }
    roundEndString += ' to end the round...';
  }

  return (
    <GameLayout gameArgs={gameArgs} gameOver={endGame} maxWidth="100%">
      <div className="w-full h-full bg-green-900 flex flex-col justify-between gap-6 items-center p-4">
        {winner && (
          <EndGameInfo
            G={G}
            didIWin={winner === playerID}
            winner={winner}
            onProceed={() => {
              setEndGame(winner === playerID ? 'You Won' : 'You Lost');
            }}
          />
        )}

        {shouldReview && (
          <EndRoundInfo
            G={G}
            callToAction={() => <Button onClick={() => moves.endReview()}>Next Round</Button>}
            footer={roundEndString}
          />
        )}

        {roundEndString && <div className="absolute bg-green-600 p-5 m-5 rounded-md z-10 w-36">{roundEndString}</div>}

        <div id="opponentCards" className="flex justify-evenly">
          {ctx.playOrder
            .filter((pID) => pID !== playerID)
            .map((pID) => [pID, G.players[pID]] as [string, ChinchonPlayerState])
            .map(([pID, p]) => {
              return (
                <div key={pID} className="max-w-sm">
                  <OpponentHand faceUp={isEliminated} playerID={pID} player={p} highlight={ctx.currentPlayer === pID} />
                </div>
              );
            })}
        </div>

        <div id="piles" className="flex justify-center gap-6">
          <div
            id="drawPile"
            className="flex flex-col text-center relative"
            onClick={() => {
              moves.drawCardFromDrawPile();
            }}
          >
            <CardView showBack />

            <div className="absolute -bottom-6 w-full">{G.drawPileLen} cards left</div>
          </div>

          <div
            id="discardPile"
            className="flex "
            onClick={() => {
              moves.drawCardFromDiscardPile();
            }}
          >
            {G.discardPile.length === 0 ? (
              <div className="bg-green-800 rounded-md w-32" />
            ) : (
              <div className="flex flex-col text-center relative">
                <CardView card={G.discardPile[G.discardPile.length - 1]} />
                <div className="absolute -bottom-6 w-full">{G.discardPileLen} cards</div>
              </div>
            )}
          </div>
        </div>

        <div id="myCards" className={'flex flex-col items-center'}>
          {isEliminated && <div className="text-red-700 font-bold bg-white p-[0.1rem] rounded-sm">ELIMINATED</div>}
          <div>Player {playerID}</div>
          <div>My Points: {myPlayer.points}</div>
          <div
            ref={myCardsRef}
            className={`p-2 rounded-md flex justify-evenly pr-6 max-w-xl ${
              isMyTurn ? 'bg-yellow-400' : 'bg-green-900'
            } `}
          >
            {myCards.map((c) => (
              <div
                className="-mr-4"
                key={c.id}
                onClick={() => {
                  if (canDiscard) {
                    setSelectedCard(selectedCard?.id === c.id ? undefined : c);
                  }
                }}
              >
                <div
                  className={`relative flex flex-col items-center transition ${
                    selectedCard?.id === c.id ? '-translate-y-4' : ''
                  }`}
                >
                  <div className="flex flex-col absolute -translate-y-full">
                    {selectedCard?.id === c.id && canDiscard && (
                      <Button
                        onClick={() => {
                          moves.discardCard(selectedCard!);
                          setSelectedCard(undefined);
                        }}
                      >
                        Discard
                      </Button>
                    )}
                    {selectedCard?.id === c.id && canDiscard && canMeldWithCard(myCards, selectedCard) && (
                      <Button
                        onClick={() => {
                          setSelectedCard(undefined);
                          moves.meldHandWithCard(selectedCard!);
                        }}
                      >
                        Meld
                      </Button>
                    )}
                  </div>
                  <CardView card={c} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GameLayout>
  );
};

export default ChinchonBoard;

// i used tailwindcss to generate these styles
const styles =
  ' \
:after, \
:before { \
  border: 0 solid #e5e7eb; \
  box-sizing: border-box; \
} \
:after, \
:before { \
  --tw-content: ""; \
} \
html { \
  -webkit-text-size-adjust: 100%; \
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \
    Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans, sans-serif, \
    Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol, Noto Color Emoji; \
  line-height: 1.5; \
  tab-size: 4; \
} \
body { \
  line-height: inherit; \
  margin: 0; \
} \
hr { \
  border-top-width: 1px; \
  color: inherit; \
  height: 0; \
} \
abbr:where([title]) { \
  -webkit-text-decoration: underline dotted; \
  text-decoration: underline dotted; \
} \
h1, \
h2, \
h3, \
h4, \
h5, \
h6 { \
  font-size: inherit; \
  font-weight: inherit; \
} \
a { \
  color: inherit; \
  text-decoration: inherit; \
} \
b, \
strong { \
  font-weight: bolder; \
} \
code, \
kbd, \
pre, \
samp { \
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \
    Liberation Mono, Courier New, monospace; \
  font-size: 1em; \
} \
small { \
  font-size: 80%; \
} \
sub, \
sup { \
  font-size: 75%; \
  line-height: 0; \
  position: relative; \
  vertical-align: baseline; \
} \
sub { \
  bottom: -0.25em; \
} \
sup { \
  top: -0.5em; \
} \
table { \
  border-collapse: collapse; \
  border-color: inherit; \
  text-indent: 0; \
} \
button, \
input, \
optgroup, \
select, \
textarea { \
  color: inherit; \
  font-family: inherit; \
  font-size: 100%; \
  line-height: inherit; \
  margin: 0; \
  padding: 0; \
} \
button, \
select { \
  text-transform: none; \
} \
[type="button"], \
[type="reset"], \
[type="submit"], \
button { \
  -webkit-appearance: button; \
  background-color: transparent; \
  background-image: none; \
} \
:-moz-focusring { \
  outline: auto; \
} \
:-moz-ui-invalid { \
  box-shadow: none; \
} \
progress { \
  vertical-align: baseline; \
} \
::-webkit-inner-spin-button, \
::-webkit-outer-spin-button { \
  height: auto; \
} \
[type="search"] { \
  -webkit-appearance: textfield; \
  outline-offset: -2px; \
} \
::-webkit-search-decoration { \
  -webkit-appearance: none; \
} \
::-webkit-file-upload-button { \
  -webkit-appearance: button; \
  font: inherit; \
} \
summary { \
  display: list-item; \
} \
blockquote, \
dd, \
dl, \
figure, \
h1, \
h2, \
h3, \
h4, \
h5, \
h6, \
hr, \
p, \
pre { \
  margin: 0; \
} \
fieldset { \
  margin: 0; \
} \
fieldset, \
legend { \
  padding: 0; \
} \
menu, \
ol, \
ul { \
  list-style: none; \
  margin: 0; \
  padding: 0; \
} \
textarea { \
  resize: vertical; \
} \
input::-webkit-input-placeholder, \
textarea::-webkit-input-placeholder { \
  color: #9ca3af; \
  opacity: 1; \
} \
input:-ms-input-placeholder, \
textarea:-ms-input-placeholder { \
  color: #9ca3af; \
  opacity: 1; \
} \
input::placeholder, \
textarea::placeholder { \
  color: #9ca3af; \
  opacity: 1; \
} \
[role="button"], \
button { \
  cursor: pointer; \
} \
:disabled { \
  cursor: default; \
} \
audio, \
canvas, \
embed, \
iframe, \
img, \
object, \
svg, \
video { \
  display: block; \
  vertical-align: middle; \
} \
img, \
video { \
  height: auto; \
  max-width: 100%; \
} \
[hidden] { \
  display: none; \
} \
*, \
:after, \
:before { \
  --tw-translate-x: 0; \
  --tw-translate-y: 0; \
  --tw-rotate: 0; \
  --tw-skew-x: 0; \
  --tw-skew-y: 0; \
  --tw-scale-x: 1; \
  --tw-scale-y: 1; \
  --tw-pan-x: ; \
  --tw-pan-y: ; \
  --tw-pinch-zoom: ; \
  --tw-scroll-snap-strictness: proximity; \
  --tw-ordinal: ; \
  --tw-slashed-zero: ; \
  --tw-numeric-figure: ; \
  --tw-numeric-spacing: ; \
  --tw-numeric-fraction: ; \
  --tw-ring-inset: ; \
  --tw-ring-offset-width: 0px; \
  --tw-ring-offset-color: #fff; \
  --tw-ring-color: rgba(59, 130, 246, 0.5); \
  --tw-ring-offset-shadow: 0 0 #0000; \
  --tw-ring-shadow: 0 0 #0000; \
  --tw-shadow: 0 0 #0000; \
  --tw-shadow-colored: 0 0 #0000; \
  --tw-blur: ; \
  --tw-brightness: ; \
  --tw-contrast: ; \
  --tw-grayscale: ; \
  --tw-hue-rotate: ; \
  --tw-invert: ; \
  --tw-saturate: ; \
  --tw-sepia: ; \
  --tw-drop-shadow: ; \
  --tw-backdrop-blur: ; \
  --tw-backdrop-brightness: ; \
  --tw-backdrop-contrast: ; \
  --tw-backdrop-grayscale: ; \
  --tw-backdrop-hue-rotate: ; \
  --tw-backdrop-invert: ; \
  --tw-backdrop-opacity: ; \
  --tw-backdrop-saturate: ; \
  --tw-backdrop-sepia: ; \
} \
.absolute { \
  position: absolute; \
} \
.relative { \
  position: relative; \
} \
.top-0 { \
  top: 0; \
} \
.right-0 { \
  right: 0; \
} \
.bottom-0 { \
  bottom: 0; \
} \
.left-0 { \
  left: 0; \
} \
.-bottom-6 { \
  bottom: -1.5rem; \
} \
.bottom-5 { \
  bottom: 1.25rem; \
} \
.z-10 { \
  z-index: 10; \
} \
.z-20 { \
  z-index: 20; \
} \
.m-5 { \
  margin: 1.25rem; \
} \
.m-1 { \
  margin: 0.25rem; \
} \
.-mr-4 { \
  margin-right: -1rem; \
} \
.flex { \
  display: flex; \
} \
.h-full { \
  height: 100%; \
} \
.w-full { \
  width: 100%; \
} \
.w-96 { \
  width: 24rem; \
} \
.w-36 { \
  width: 9rem; \
} \
.w-32 { \
  width: 8rem; \
} \
.w-9 { \
  width: 2.25rem; \
} \
.w-2/3 { \
  width: 66.666667%; \
} \
.w-8 { \
  width: 2rem; \
} \
.max-w-sm { \
  max-width: 24rem; \
} \
.max-w-xl { \
  max-width: 36rem; \
} \
.max-w-lg { \
  max-width: 32rem; \
} \
.flex-grow { \
  flex-grow: 1; \
} \
.-translate-y-4 { \
  --tw-translate-y: -1rem; \
} \
.-translate-y-4, \
.-translate-y-full { \
  -webkit-transform: translate(var(--tw-translate-x), var(--tw-translate-y)) \
    rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) \
    scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y)); \
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) \
    rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) \
    scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y)); \
} \
.-translate-y-full { \
  --tw-translate-y: -100%; \
} \
.cursor-not-allowed { \
  cursor: not-allowed; \
} \
.flex-col { \
  flex-direction: column; \
} \
.flex-wrap { \
  flex-wrap: wrap; \
} \
.items-center { \
  align-items: center; \
} \
.justify-center { \
  justify-content: center; \
} \
.justify-between { \
  justify-content: space-between; \
} \
.justify-evenly { \
  justify-content: space-evenly; \
} \
.gap-3 { \
  gap: 0.75rem; \
} \
.gap-6 { \
  gap: 1.5rem; \
} \
.gap-7 { \
  gap: 5rem; \
} \
.gap-5 { \
  gap: 1.25rem; \
} \
.gap-1 { \
  gap: 0.25rem; \
} \
.rounded-md { \
  border-radius: 0.375rem; \
} \
.rounded-sm { \
  border-radius: 0.125rem; \
} \
.rounded { \
  border-radius: 0.25rem; \
} \
.border-2 { \
  border-width: 2px; \
} \
.border-b-2 { \
  border-bottom-width: 2px; \
} \
.border-blue-300 { \
  --tw-border-opacity: 1; \
  border-color: rgb(147 197 253 / var(--tw-border-opacity)); \
} \
.border-black { \
  --tw-border-opacity: 1; \
  border-color: rgb(0 0 0 / var(--tw-border-opacity)); \
} \
.bg-green-900 { \
  --tw-bg-opacity: 1; \
  background-color: rgb(20 83 45 / var(--tw-bg-opacity)); \
} \
.bg-green-600 { \
  --tw-bg-opacity: 1; \
  background-color: rgb(22 163 74 / var(--tw-bg-opacity)); \
} \
.bg-green-800 { \
  --tw-bg-opacity: 1; \
  background-color: rgb(22 101 52 / var(--tw-bg-opacity)); \
} \
.bg-white { \
  --tw-bg-opacity: 1; \
  background-color: rgb(255 255 255 / var(--tw-bg-opacity)); \
} \
.bg-yellow-400 { \
  --tw-bg-opacity: 1; \
  background-color: rgb(250 204 21 / var(--tw-bg-opacity)); \
} \
.bg-orange-500 { \
  --tw-bg-opacity: 1; \
  background-color: rgb(249 115 22 / var(--tw-bg-opacity)); \
} \
.bg-red-700 { \
  --tw-bg-opacity: 1; \
  background-color: rgb(185 28 28 / var(--tw-bg-opacity)); \
} \
.p-4 { \
  padding: 1rem; \
} \
.p-5 { \
  padding: 1.25rem; \
} \
.p-[0.1rem] { \
  padding: 0.1rem; \
} \
.p-2 { \
  padding: 0.5rem; \
} \
.p-1 { \
  padding: 0.25rem; \
} \
.py-2 { \
  padding-bottom: 0.5rem; \
  padding-top: 0.5rem; \
} \
.px-4 { \
  padding-left: 1rem; \
  padding-right: 1rem; \
} \
.pr-6 { \
  padding-right: 1.5rem; \
} \
.pr-5 { \
  padding-right: 1.25rem; \
} \
.text-center { \
  text-align: center; \
} \
.font-serif { \
  font-family: ui-serif, Georgia, Cambria, Times New Roman, Times, serif; \
} \
.text-lg { \
  font-size: 1.125rem; \
  line-height: 1.75rem; \
} \
.text-2xl { \
  font-size: 1.5rem; \
  line-height: 2rem; \
} \
.font-bold { \
  font-weight: 700; \
} \
.ordinal { \
  --tw-ordinal: ordinal; \
  -webkit-font-feature-settings: var(--tw-ordinal) var(--tw-slashed-zero) \
    var(--tw-numeric-figure) var(--tw-numeric-spacing) \
    var(--tw-numeric-fraction); \
  font-feature-settings: var(--tw-ordinal) var(--tw-slashed-zero) \
    var(--tw-numeric-figure) var(--tw-numeric-spacing) \
    var(--tw-numeric-fraction); \
  font-variant-numeric: var(--tw-ordinal) var(--tw-slashed-zero) \
    var(--tw-numeric-figure) var(--tw-numeric-spacing) \
    var(--tw-numeric-fraction); \
} \
.text-red-700 { \
  --tw-text-opacity: 1; \
  color: rgb(185 28 28 / var(--tw-text-opacity)); \
} \
.text-white { \
  --tw-text-opacity: 1; \
  color: rgb(255 255 255 / var(--tw-text-opacity)); \
} \
.underline { \
  -webkit-text-decoration-line: underline; \
  text-decoration-line: underline; \
} \
.opacity-0 { \
  opacity: 0; \
} \
.opacity-80 { \
  opacity: 0.8; \
} \
.shadow-2xl { \
  --tw-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); \
  --tw-shadow-colored: 0 25px 50px -12px var(--tw-shadow-color); \
} \
.shadow-2xl, \
.shadow-lg { \
  box-shadow: 0 0 #0000, 0 0 #0000, var(--tw-shadow); \
  box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), \
    var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow); \
} \
.shadow-lg { \
  --tw-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), \
    0 4px 6px -4px rgba(0, 0, 0, 0.1); \
  --tw-shadow-colored: 0 10px 15px -3px var(--tw-shadow-color), \
    0 4px 6px -4px var(--tw-shadow-color); \
} \
.filter { \
  -webkit-filter: var(--tw-blur) var(--tw-brightness) var(--tw-contrast) \
    var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) \
    var(--tw-sepia) var(--tw-drop-shadow); \
  filter: var(--tw-blur) var(--tw-brightness) var(--tw-contrast) \
    var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) \
    var(--tw-sepia) var(--tw-drop-shadow); \
} \
.transition { \
  transition-duration: 0.15s; \
  transition-property: color, background-color, border-color, fill, stroke, \
    opacity, box-shadow, -webkit-text-decoration-color, -webkit-transform, \
    -webkit-filter, -webkit-backdrop-filter; \
  transition-property: color, background-color, border-color, \
    text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, \
    backdrop-filter; \
  transition-property: color, background-color, border-color, \
    text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, \
    backdrop-filter, -webkit-text-decoration-color, -webkit-transform, \
    -webkit-filter, -webkit-backdrop-filter; \
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); \
} \
body { \
  color: rgb(255 255 255 / var(--tw-text-opacity)); \
} \
body, \
input, \
select { \
  --tw-text-opacity: 1; \
} \
input, \
select { \
  color: rgb(0 0 0 / var(--tw-text-opacity)); \
} \
.hover:scale-[2]:hover { \
  --tw-scale-x: 2; \
  --tw-scale-y: 2; \
  -webkit-transform: translate(var(--tw-translate-x), var(--tw-translate-y)) \
    rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) \
    scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y)); \
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) \
    rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) \
    scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y)); \
} \
.hover:bg-orange-700:hover { \
  --tw-bg-opacity: 1; \
  background-color: rgb(194 65 12 / var(--tw-bg-opacity)); \
} \
/*# sourceMappingURL=main.30122f4a.css.map*/ \
';
