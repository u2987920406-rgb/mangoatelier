// Starter PandaCSS + Ark UI — App interactive / calculateur / outil
// styled-system/ est généré automatiquement par "panda codegen" au postinstall
// Décris l'outil dans le chat : Mango adapte les composants, les calculs, le thème
import { useState } from 'react';
import { css } from '../styled-system/css';
import { NumberInput } from '@ark-ui/react/number-input';
import { Slider } from '@ark-ui/react/slider';
import { Tabs } from '@ark-ui/react/tabs';

// ── Tokens utilitaires ────────────────────────────────────
const S = {
  page: css({
    minH: '100vh', bg: 'gray.950', color: 'white',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    p: '6', fontFamily: 'system-ui, sans-serif',
  }),
  card: css({
    bg: 'gray.900', border: '1px solid token(colors.gray.800)',
    borderRadius: 'card', p: '8', w: '100%', maxW: '480px',
  }),
  title: css({ fontSize: '2xl', fontWeight: 'bold', mb: '6', color: 'brand.200' }),
  tabList: css({
    display: 'flex', gap: '1', mb: '6',
    borderBottom: '1px solid token(colors.gray.800)',
  }),
  tab: css({
    px: '4', py: '2', fontSize: 'sm', fontWeight: '500', cursor: 'pointer',
    color: 'gray.400', bg: 'transparent', border: 'none', outline: 'none',
    borderBottom: '2px solid transparent', transition: 'color 0.15s',
    _selected: { color: 'brand.400', borderBottomColor: 'token(colors.brand.400)' },
    _hover: { color: 'white' },
  }),
  label: css({ display: 'block', fontSize: 'sm', color: 'gray.400', mb: '2' }),
  input: css({
    w: '100%', p: '3', bg: 'gray.800',
    border: '1px solid token(colors.gray.700)',
    borderRadius: 'md', color: 'white', fontSize: 'lg',
    outline: 'none',
    _focusVisible: { borderColor: 'token(colors.brand.500)' },
  }),
  track: css({ h: '2', bg: 'gray.700', borderRadius: 'full', pos: 'relative', my: '4' }),
  range: css({ h: '100%', bg: 'brand.500', borderRadius: 'full' }),
  thumb: css({
    w: '5', h: '5', bg: 'brand.500', borderRadius: 'full',
    pos: 'absolute', top: '50%', transform: 'translateY(-50%)',
    cursor: 'grab', _active: { cursor: 'grabbing', bg: 'brand.400' },
  }),
  result: css({
    mt: '6', p: '4', bg: 'gray.800',
    border: '1px solid token(colors.brand.900)',
    borderRadius: 'md', textAlign: 'center',
  }),
  resultVal: css({ fontSize: '3xl', fontWeight: 'bold', color: 'brand.200' }),
  resultSub: css({ fontSize: 'xs', color: 'gray.500', mt: '1' }),
};

// ── Calculateur TVA ──────────────────────────────────────
function TvaCalc() {
  const [ht, setHt] = useState(100);
  const [taux, setTaux] = useState([20]);
  const tva = ht * (taux[0] / 100);
  const ttc = ht + tva;

  return (
    <div>
      <label className={S.label}>Montant HT (€)</label>
      <NumberInput.Root
        value={String(ht)}
        onValueChange={({ value }) => setHt(Number(value) || 0)}
        min={0} step={10}
      >
        <NumberInput.Input className={S.input} />
      </NumberInput.Root>

      <label className={S.label} style={{ marginTop: 20 }}>
        Taux TVA : <strong>{taux[0]} %</strong>
      </label>
      <Slider.Root min={0} max={30} step={1} value={taux} onValueChange={({ value }) => setTaux(value)}>
        <Slider.Control>
          <Slider.Track className={S.track}>
            <Slider.Range className={S.range} />
          </Slider.Track>
          <Slider.Thumb index={0} className={S.thumb} />
        </Slider.Control>
      </Slider.Root>

      <div className={S.result}>
        <div className={css({ color: 'gray.400', fontSize: 'sm', mb: '1' })}>Total TTC</div>
        <div className={S.resultVal}>€{ttc.toFixed(2)}</div>
        <div className={S.resultSub}>TVA : €{tva.toFixed(2)}</div>
      </div>
    </div>
  );
}

// ── Convertisseur de distances ────────────────────────────
function Converter() {
  const [km, setKm] = useState(100);
  return (
    <div>
      <label className={S.label}>Kilomètres</label>
      <NumberInput.Root
        value={String(km)}
        onValueChange={({ value }) => setKm(Number(value) || 0)}
        min={0} step={10}
      >
        <NumberInput.Input className={S.input} />
      </NumberInput.Root>
      <div className={S.result}>
        <div className={css({ color: 'gray.400', fontSize: 'sm', mb: '1' })}>Miles</div>
        <div className={S.resultVal}>{(km * 0.621371).toFixed(3)}</div>
        <div className={S.resultSub}>
          {(km * 1000).toLocaleString()} m · {(km / 1.852).toFixed(2)} nm
        </div>
      </div>
    </div>
  );
}

// ── App ──────────────────────────────────────────────────
export default function App() {
  return (
    <div className={S.page}>
      <div className={S.card}>
        <h1 className={S.title}>Outil interactif</h1>
        <Tabs.Root defaultValue="tva">
          <Tabs.List className={S.tabList}>
            <Tabs.Trigger value="tva"     className={S.tab}>Calculateur TVA</Tabs.Trigger>
            <Tabs.Trigger value="convert" className={S.tab}>Convertisseur</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="tva">     <TvaCalc />   </Tabs.Content>
          <Tabs.Content value="convert"> <Converter /> </Tabs.Content>
        </Tabs.Root>
      </div>
    </div>
  );
}
