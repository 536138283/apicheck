import { MonitorState, StatusPageMonitor } from '@/uptime.types'
import { Box, Tooltip } from '@mantine/core'
import { useResizeObserver } from '@mantine/hooks'
import { HEALTH_STATUS, HealthStatus, getLatencyHealth } from '@/util/health'
import classes from '@/styles/Monitor.module.css'

const RECENT_WINDOW_SECONDS = 12 * 60 * 60
const EMPTY_STATUS = {
  label: '暂无记录',
  color: 'rgba(148, 163, 184, 0.62)',
  severity: 0,
} as const

type LatencyPoint = MonitorState['latency'][string]['recent'][number]
type IncidentList = MonitorState['incident'][string]
type BucketStatus = HealthStatus | typeof EMPTY_STATUS

function formatTimeRange(start: number, end: number) {
  const options = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  } as const

  return `${new Date(start * 1000).toLocaleTimeString('zh-CN', options)}-${new Date(
    end * 1000
  ).toLocaleTimeString('zh-CN', options)}`
}

function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60))

  return minutes >= 60 ? `${Math.round(minutes / 60)}小时` : `${minutes}分钟`
}

function average(values: number[]) {
  if (values.length === 0) return null

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function incidentOverlapsInterval(
  start: number,
  end: number,
  incidents: IncidentList | undefined,
  fallbackEnd: number
) {
  return (
    incidents?.some((incident) => {
      const incidentStart = incident.start[0]
      const incidentEnd = incident.end ?? fallbackEnd

      return incidentStart < end && incidentEnd >= start
    }) ?? false
  )
}

function getBucketStatus(points: LatencyPoint[], hasIncident: boolean): BucketStatus {
  if (hasIncident) {
    return HEALTH_STATUS.error
  }

  if (points.length === 0) {
    return EMPTY_STATUS
  }

  return points.reduce<HealthStatus>((worstStatus, point) => {
    const pointStatus = getLatencyHealth(point.ping)

    return pointStatus.severity > worstStatus.severity ? pointStatus : worstStatus
  }, HEALTH_STATUS.normal)
}

export default function DetailBar({
  monitor,
  state,
}: {
  monitor: StatusPageMonitor
  state: MonitorState
}) {
  const [barRef, barRect] = useResizeObserver()
  const incidents = state.incident[monitor.id]
  const currentTime = Math.round(Date.now() / 1000)
  const recentLatency = state.latency[monitor.id]?.recent ?? []
  const lastIncident = incidents?.slice(-1)[0]
  const shouldAppendCurrentError =
    lastIncident?.end === undefined &&
    (recentLatency.length === 0 || recentLatency.slice(-1)[0].time < lastIncident.start[0])

  const statusPoints = shouldAppendCurrentError
    ? [
        ...recentLatency,
        {
          loc: recentLatency.slice(-1)[0]?.loc ?? '',
          ping: Number.NaN,
          time: Math.max(lastIncident.start[0], state.lastUpdate),
        },
      ]
    : recentLatency
  const barWidth = 7
  const gapWidth = 2
  const horizontalPadding = 14
  const fallbackWidth = 648
  const availableWidth = Math.max((barRect.width || fallbackWidth) - horizontalPadding, 0)
  const visibleCount = Math.max(24, Math.floor((availableWidth + gapWidth) / (barWidth + gapWidth)))
  const windowStart = currentTime - RECENT_WINDOW_SECONDS
  const bucketDuration = RECENT_WINDOW_SECONDS / visibleCount
  const buckets = Array.from({ length: visibleCount }, (_, index) => {
    const start = windowStart + index * bucketDuration
    const end = index === visibleCount - 1 ? currentTime : windowStart + (index + 1) * bucketDuration
    const points = statusPoints.filter(
      (point) => point.time >= start && (point.time < end || index === visibleCount - 1)
    )
    const hasIncident = incidentOverlapsInterval(start, end, incidents, currentTime)
    const finitePings = points
      .map((point) => point.ping)
      .filter((ping): ping is number => Number.isFinite(ping))
    const minPing = finitePings.length > 0 ? Math.min(...finitePings) : null
    const maxPing = finitePings.length > 0 ? Math.max(...finitePings) : null
    const averagePing = average(finitePings)

    return {
      start,
      end,
      hasIncident,
      hasData: points.length > 0,
      recordCount: points.length,
      averagePing,
      minPing,
      maxPing,
      status: getBucketStatus(points, hasIncident),
    }
  })
  const legendStatuses = [
    HEALTH_STATUS.normal,
    HEALTH_STATUS.degraded,
    HEALTH_STATUS.error,
    EMPTY_STATUS,
  ]
  const visibleStatusLabels = new Set(buckets.map((bucket) => bucket.status.label))

  return (
    <>
      <div className={classes.sectionHeader}>
        <span className={classes.sectionTitle}>
          服务状态
          <span className={classes.sectionMeta}>每格约 {formatDuration(bucketDuration)}</span>
        </span>
        <span className={classes.barLegend}>
          {legendStatuses.map((status) => (
            <span
              className={classes.legendItem}
              data-present={visibleStatusLabels.has(status.label)}
              key={status.label}
            >
              <span className={classes.legendDot} style={{ background: status.color }} />
              {status.label}
            </span>
          ))}
        </span>
      </div>
      <Box className={classes.uptimeBars} ref={barRef}>
        {buckets.map((bucket, index) => {
          const timeRange = formatTimeRange(bucket.start, bucket.end)

          return (
            <Tooltip
              multiline
              key={`${bucket.start}-${index}`}
              events={{ hover: true, focus: false, touch: true }}
              label={
                bucket.hasIncident ? (
                  <>
                    <div>{timeRange} 检查失败</div>
                    <div>状态：错误</div>
                    <div>响应：检查失败</div>
                    <div>记录：{bucket.recordCount} 次</div>
                  </>
                ) : bucket.hasData ? (
                  <>
                    <div>{timeRange}</div>
                    <div>状态：{bucket.status.label}</div>
                    {bucket.averagePing !== null ? (
                      <div>平均响应：{bucket.averagePing}ms</div>
                    ) : null}
                    <div>记录：{bucket.recordCount} 次</div>
                    {bucket.minPing !== null && bucket.maxPing !== null ? (
                      <div>
                        范围：
                        {bucket.minPing === bucket.maxPing
                          ? `${bucket.maxPing}ms`
                          : `${bucket.minPing}-${bucket.maxPing}ms`}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    <div>{timeRange}</div>
                    <div>暂无状态记录</div>
                  </>
                )
              }
            >
              <div
                className={classes.uptimeBar}
                style={{
                  background: bucket.status.color,
                }}
              />
            </Tooltip>
          )
        })}
      </Box>
    </>
  )
}
