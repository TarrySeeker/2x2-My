import StudioClient from './StudioClient'

export function generateStaticParams() {
  return [{ index: [] }]
}

export default function StudioPage() {
  return <StudioClient />
}
