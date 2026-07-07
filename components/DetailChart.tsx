import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip as ChartTooltip,
  Legend,
  TimeScale,
} from 'chart.js'
import 'chartjs-adapter-moment'
import { MonitorState, StatusPageMonitor } from '@/uptime.types'
import { iataToCountry } from '@/util/iata'
import { getLatencyHealth, isDuringIncident } from '@/util/health'
import classes from '@/styles/Monitor.module.css'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTooltip,
  Legend,
  TimeScale
)

export default function DetailChart({
  monitor,
  state,
}: {
  monitor: StatusPageMonitor
  state: MonitorState
}) {
  const currentTime = Math.round(Date.now() / 1000)
  const incidents = state.incident[monitor.id]
  const latencyData = state.latency[monitor.id].recent.map((point) => ({
    x: point.time * 1000,
    y: point.ping,
    loc: point.loc,
    isError: isDuringIncident(point.time, incidents, currentTime),
  }))

  let data = {
    datasets: [
      {
        data: latencyData,
        borderColor: '#059669',
        borderWidth: 2,
        radius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: '#059669',
        cubicInterpolationMode: 'monotone' as const,
        segment: {
          borderColor: (ctx: any) => {
            return getLatencyHealth(ctx.p1.parsed.y, ctx.p1.raw.isError).color
          },
        },
        tension: 0.4,
      },
    ],
  }

  let options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    animation: {
      duration: 0,
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (item: any) => {
            if (item.raw.isError) {
              return `检查失败 (${iataToCountry(item.raw.loc)})`
            }
            if (Number.isFinite(item.parsed.y)) {
              return `${item.parsed.y}ms (${iataToCountry(item.raw.loc)})`
            }
          },
        },
      },
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        grid: {
          color: 'rgba(96, 112, 134, 0.14)',
          drawBorder: false,
        },
        ticks: {
          source: 'auto' as const,
          maxRotation: 0,
          autoSkip: true,
          color: '#607086',
        },
      },
      y: {
        grid: {
          color: 'rgba(96, 112, 134, 0.14)',
          drawBorder: false,
        },
        ticks: {
          color: '#607086',
        },
      },
    },
  }

  return (
    <>
      <div className={classes.sectionHeader}>
        <span className={classes.sectionTitle}>
          响应趋势
          <span className={classes.sectionMeta}>ms</span>
        </span>
      </div>
      <div className={classes.chartFrame}>
        <Line options={options} data={data} />
      </div>
    </>
  )
}
