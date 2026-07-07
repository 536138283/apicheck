import { Text } from '@mantine/core'
import { MonitorState, StatusPageMonitor } from '@/uptime.types'
import { IconAlertCircle, IconCircleCheck } from '@tabler/icons-react'
import DetailChart from './DetailChart'
import DetailBar from './DetailBar'
import { getLatencyHealth, isIncidentOpen } from '@/util/health'
import classes from '@/styles/Monitor.module.css'

const RECENT_WINDOW_SECONDS = 12 * 60 * 60

function calculateAvailabilityPercent(
  incidents: MonitorState['incident'][string],
  windowStartTime: number,
  windowEndTime: number
) {
  const totalTime = windowEndTime - windowStartTime
  if (totalTime <= 0) return '100.0'

  let downTime = 0
  for (const incident of incidents) {
    const incidentStart = Math.max(incident.start[0], windowStartTime)
    const incidentEnd = Math.min(incident.end ?? windowEndTime, windowEndTime)
    if (incidentEnd > incidentStart) {
      downTime += incidentEnd - incidentStart
    }
  }

  const availability = Math.max(0, Math.min(100, ((totalTime - downTime) / totalTime) * 100))

  return availability.toFixed(1)
}

export default function MonitorDetail({
  monitor,
  state,
}: {
  monitor: StatusPageMonitor
  state: MonitorState | null | undefined
}) {
  const latency = state?.latency?.[monitor.id]
  const incidents = state?.incident?.[monitor.id]

  if (!state || !latency?.recent?.length || !incidents?.length)
    return (
      <div className={classes.emptyDetail}>
        <Text fw={700} className={classes.monitorName}>
          {monitor.name}
          <span className={classes.windowBadge}>近12小时</span>
        </Text>
        <Text mt="sm" fw={700} className={classes.emptyMessage}>
          该服务已配置，但当前还没有状态记录。请等待一次定时检查完成后再刷新页面。
        </Text>
      </div>
    )

  const currentTime = Math.round(Date.now() / 1000)
  const availabilityPercent = calculateAvailabilityPercent(
    incidents,
    currentTime - RECENT_WINDOW_SECONDS,
    currentTime
  )
  const latestLatency = latency.recent.slice(-1)[0]
  const hasOpenIncident = isIncidentOpen(incidents)
  const currentStatus = getLatencyHealth(latestLatency?.ping, hasOpenIncident)
  const responseText = hasOpenIncident
    ? '检查失败'
    : Number.isFinite(latestLatency?.ping)
      ? `${latestLatency.ping}ms`
      : '暂无数据'
  const statusIcon =
    currentStatus.label === '正常' ? (
      <IconCircleCheck style={{ width: '1.25em', height: '1.25em', color: currentStatus.color }} />
    ) : (
      <IconAlertCircle style={{ width: '1.25em', height: '1.25em', color: currentStatus.color }} />
    )

  const monitorNameElement = (
    <Text fw={700} className={classes.monitorName}>
      {monitor.statusPageLink ? (
        <a
          href={monitor.statusPageLink}
          target="_blank"
          rel="noreferrer"
          aria-label={`打开${monitor.name}`}
        >
          {statusIcon} {monitor.name}
        </a>
      ) : (
        <>
          {statusIcon} {monitor.name}
        </>
      )}
      <span className={classes.windowBadge}>近12小时</span>
    </Text>
  )

  return (
    <>
      <div className={classes.monitorHeader}>
        {monitorNameElement}

        <div className={classes.metrics}>
          <Text fw={700} className={classes.metricPill} style={{ color: currentStatus.color }}>
            当前：{currentStatus.label}
          </Text>
          <Text fw={700} className={classes.metricPill} style={{ color: currentStatus.color }}>
            响应：{responseText}
          </Text>
          <Text fw={700} className={`${classes.metricPill} ${classes.mutedMetric}`}>
            可用率：{availabilityPercent}%
          </Text>
        </div>
      </div>

      <DetailBar monitor={monitor} state={state} />
      <DetailChart monitor={monitor} state={state} />
    </>
  )
}
