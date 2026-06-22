import { useState } from 'react';
import { Icon } from '@app/components/Icon';
import { LangSwitch } from '@app/components/LangSwitch';
import { ACCENT_OPTIONS, type TweaksController } from './useTweaks';

const CARD_WIDTH_MIN = 140;
const CARD_WIDTH_MAX = 230;
const CARD_WIDTH_STEP = 2;

export function TweaksPanel({ tweaks, setTweak }: TweaksController): React.JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="twk-fab"
        onClick={() => setOpen((value) => !value)}
        aria-label="Personnaliser l'apparence"
        title="Personnaliser l'apparence"
      >
        <Icon name="gear" size={20} />
      </button>

      {open && (
        <div className="twk-panel" role="dialog" aria-label="Réglages d'apparence">
          <div className="twk-hd">
            <b>Apparence</b>
            <button className="twk-x" aria-label="Fermer" onClick={() => setOpen(false)}>
              <Icon name="x" size={16} />
            </button>
          </div>
          <div className="twk-body">
            <div className="twk-sect">Langue / Language</div>
            <LangSwitch />

            <div className="twk-sect">Couleur d&apos;accent</div>
            <div className="twk-colors">
              {ACCENT_OPTIONS.map((color) => (
                <button
                  key={color}
                  className={`twk-color${tweaks.accent === color ? ' is-on' : ''}`}
                  style={{ background: color }}
                  onClick={() => setTweak('accent', color)}
                  aria-label={`Accent ${color}`}
                />
              ))}
            </div>

            <div className="twk-sect">Taille des cartes</div>
            <input
              type="range"
              className="twk-range"
              min={CARD_WIDTH_MIN}
              max={CARD_WIDTH_MAX}
              step={CARD_WIDTH_STEP}
              value={tweaks.cardWidth}
              onChange={(event) => setTweak('cardWidth', Number(event.target.value))}
            />
            <div className="twk-rowval">{tweaks.cardWidth}px</div>

            <div className="twk-sect">Mouvement</div>
            <button
              className={`twk-toggle${tweaks.motion ? ' is-on' : ''}`}
              onClick={() => setTweak('motion', !tweaks.motion)}
            >
              <span className="twk-toggle-dot" />
              <span>Animations {tweaks.motion ? 'activées' : 'désactivées'}</span>
            </button>

            <div className="twk-sect">Spoilers</div>
            <button
              className={`twk-toggle${tweaks.hideSpoilers ? ' is-on' : ''}`}
              onClick={() => setTweak('hideSpoilers', !tweaks.hideSpoilers)}
            >
              <span className="twk-toggle-dot" />
              <span>Masquer les épisodes non vus</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
