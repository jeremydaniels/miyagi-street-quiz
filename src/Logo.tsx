import mark from './assets/miyagi-mark.png'

// The Miyagi Labs mark. The image has transparent padding, so the visible mark
// is about 83% of the size set in CSS (.logo / .logo-large).
export default function Logo({ large = false, decorative = false }: { large?: boolean; decorative?: boolean }) {
  return <img className={large ? 'logo logo-large' : 'logo'} src={mark} alt={decorative ? '' : 'Miyagi Labs'} />
}
