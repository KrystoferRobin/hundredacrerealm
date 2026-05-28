'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  SetupCardData,
  SetupCardHolder,
  flattenHeldNames,
  holderDisplayName,
  normalizeSetupCard,
  sectionLabel,
  sectionLayout,
  sortedSectionKeys,
} from '@/lib/setup-card-layout';
import { ItemHoverLabel } from './ItemHoverLabel';

interface SetupCardModalProps {
  sessionId: string;
  open: boolean;
  onClose: () => void;
}

function SetupCardHolderBox({ holder }: { holder: SetupCardHolder }) {
  const heldNames = flattenHeldNames(holder);
  const count = holder.heldCount ?? heldNames.length;

  return (
    <div className="min-w-[132px] max-w-[180px] rounded-md border-2 border-[#bfa76a] bg-[#fff8e1] p-2 shadow-sm">
      <div className="text-xs font-bold text-[#6b3e26] font-serif leading-tight mb-1">
        {holderDisplayName(holder)}
      </div>
      {count > 0 && (
        <div className="text-[10px] text-[#4b3a1e] font-serif mb-1">
          {count} held
        </div>
      )}
      {heldNames.length > 0 && (
        <div className="flex flex-wrap gap-x-1 gap-y-0.5 text-[10px] text-[#6b3e26] font-serif">
          {heldNames.map((name, idx) => {
            const isPlaceholder = name.startsWith('(');
            if (isPlaceholder) {
              return (
                <span key={`${holder.id ?? holder.name}-${idx}`} className="italic text-[#4b3a1e]">
                  {name}
                </span>
              );
            }
            return (
              <span key={`${name}-${idx}`}>
                <ItemHoverLabel name={name} />
                {idx < heldNames.length - 1 ? ',' : ''}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SetupCardSection({ sectionKey, holders }: { sectionKey: string; holders: SetupCardHolder[] }) {
  const { columns, nonMd } = sectionLayout(holders);
  const hasDieColumns = columns.some((col) => col.length > 0);

  return (
    <section className="mb-8">
      <h3 className="text-lg font-bold text-[#6b3e26] font-serif mb-3 border-b-2 border-[#bfa76a] pb-1">
        {sectionLabel(sectionKey)}
      </h3>

      {hasDieColumns && (
        <div className="mb-4 overflow-x-auto">
          <div className="grid grid-cols-6 gap-2 min-w-[720px]">
            {[1, 2, 3, 4, 5, 6].map((die, idx) => (
              <div key={die} className="flex flex-col gap-2">
                <div className="text-center text-sm font-bold text-[#6b3e26] font-serif bg-[#f3e3b2] rounded py-1 border border-[#bfa76a]">
                  {die}
                </div>
                {columns[idx].map((holder) => (
                  <SetupCardHolderBox key={holder.id ?? `${holder.name}-${idx}`} holder={holder} />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {nonMd.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {nonMd.map((holder) => (
            <SetupCardHolderBox key={holder.id ?? holder.name} holder={holder} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function SetupCardModal({ sessionId, open, onClose }: SetupCardModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [card, setCard] = useState<SetupCardData | null>(null);
  const [source, setSource] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/session/${sessionId}/setup-card`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Setup card not available');
      }
      const json = await res.json();
      setSource(json.source ?? null);
      setCard(normalizeSetupCard(json.data));
    } catch (e) {
      setCard(null);
      setError(e instanceof Error ? e.message : 'Failed to load setup card');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (open) {
      load();
    }
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const bySection = card?.bySection ?? {};
  const sectionKeys = sortedSectionKeys(bySection);
  const nativeHolders = card?.nativeChartHolders ?? [];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-lg border-4 border-[#bfa76a] bg-[#fff8e1] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="setup-card-title"
      >
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b-2 border-[#bfa76a] bg-[#f3e3b2]">
          <div>
            <h2 id="setup-card-title" className="text-2xl font-bold text-[#6b3e26] font-serif">
              Treasure Setup Card
            </h2>
            {source && (
              <p className="text-xs text-[#4b3a1e] font-serif mt-1">
                Source: {source}
                {card?.summary?.holderCount != null && (
                  <> · {String(card.summary.holderCount)} holders</>
                )}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border-2 border-[#6b3e26] bg-[#fff8e1] px-4 py-2 text-sm font-serif font-semibold text-[#6b3e26] hover:bg-[#bfa76a] hover:text-[#fff8e1] transition-colors"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <p className="text-center text-[#6b3e26] font-serif italic py-12">Loading setup card…</p>
          )}
          {!loading && error && (
            <p className="text-center text-red-700 font-serif py-12">{error}</p>
          )}
          {!loading && !error && card && (
            <>
              {sectionKeys.map((key) => (
                <SetupCardSection key={key || '_empty'} sectionKey={key} holders={bySection[key]} />
              ))}

              {nativeHolders.length > 0 && (
                <section className="mb-4">
                  <h3 className="text-lg font-bold text-[#6b3e26] font-serif mb-3 border-b-2 border-[#bfa76a] pb-1">
                    Chart of Clans
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {nativeHolders.map((holder) => (
                      <SetupCardHolderBox key={holder.id ?? holder.name} holder={holder} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
