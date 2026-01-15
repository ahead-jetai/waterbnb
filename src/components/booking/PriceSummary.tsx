import { formatCurrency } from '../../utils/booking'

type PriceLineItem = {
  label: string
  amount: number
}

type PriceSummaryProps = {
  lineItems: PriceLineItem[]
  total: number
  totalLabel?: string
  currency?: string
  showCurrencyInTotal?: boolean
  footer?: React.ReactNode
  className?: string
}

export default function PriceSummary({
  lineItems,
  total,
  totalLabel = 'Total',
  currency = 'USD',
  showCurrencyInTotal = true,
  footer,
  className = ''
}: PriceSummaryProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {lineItems.map((item, index) => (
        <div key={index} className="flex justify-between">
          <span className="text-gray-700">{item.label}</span>
          <span className="font-semibold">{formatCurrency(item.amount)}</span>
        </div>
      ))}
      <div className="border-t pt-3 flex justify-between text-lg font-bold">
        <span>{totalLabel}</span>
        <span>
          {formatCurrency(total)}{showCurrencyInTotal ? ` ${currency}` : ''}
        </span>
      </div>
      {footer && <div className="text-sm text-gray-600 pt-2">{footer}</div>}
    </div>
  )
}
