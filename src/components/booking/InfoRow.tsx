type InfoRowProps = {
  label: string
  value: string | number | undefined
  className?: string
}

export default function InfoRow({ label, value, className = '' }: InfoRowProps) {
  if (value === undefined) return null

  return (
    <div className={className}>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  )
}
