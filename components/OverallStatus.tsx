import { Center, Title } from '@mantine/core'
import { IconCircleCheck, IconAlertCircle } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { MonitorState, StatusPageMonitor } from '@/uptime.types'
import { HEALTH_STATUS, getLatencyHealth, isIncidentOpen } from '@/util/health'
import classes from '@/styles/Status.module.css'

function formatElapsed(seconds: number) {
  if (seconds < 60) return `${seconds} 秒`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小时`
  return `${Math.floor(seconds / 86400)} 天`
}

function useWindowVisibility() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === 'visible')
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
}

export default function OverallStatus({
  state,
  monitors,
}: {
  state: MonitorState
  monitors: StatusPageMonitor[]
}) {
  const statuses = monitors.map((monitor) => {
    const monitorId = monitor.id
    const latestLatency = state.latency[monitorId]?.recent?.slice(-1)[0]
    const hasData = Boolean(latestLatency && state.incident[monitorId]?.length)

    return {
      hasData,
      health: hasData
        ? getLatencyHealth(latestLatency?.ping, isIncidentOpen(state.incident[monitorId]))
        : HEALTH_STATUS.degraded,
    }
  })
  const totalCount = statuses.length
  const pendingCount = statuses.filter((status) => !status.hasData).length
  const errorCount = statuses.filter((status) => status.health.label === '错误').length
  const degradedCount = statuses.filter((status) => status.health.label === '降级').length
  const overallSeverity = errorCount > 0 ? 2 : degradedCount > 0 || pendingCount > 0 ? 1 : 0
  const overallColor = overallSeverity === 2 ? '#b91c1c' : overallSeverity === 1 ? '#d97706' : '#059669'

  let statusString = '全部服务运行正常'
  if (totalCount === 0) {
    statusString = '暂无已配置服务'
  } else if (pendingCount === totalCount) {
    statusString = '等待首次检查数据'
  } else if (errorCount === totalCount) {
    statusString = '全部服务异常'
  } else if (errorCount > 0) {
    statusString = `部分服务异常（${errorCount}/${totalCount} 个服务）`
  } else if (degradedCount > 0) {
    statusString = `部分服务响应降级（${degradedCount}/${totalCount} 个服务）`
  } else if (pendingCount > 0) {
    statusString = `部分服务等待检查数据（${pendingCount}/${totalCount} 个服务）`
  }
  const icon =
    overallSeverity === 0 ? (
      <IconCircleCheck className={classes.statusIcon} style={{ color: overallColor }} />
    ) : (
      <IconAlertCircle className={classes.statusIcon} style={{ color: overallColor }} />
    )

  const [openTime] = useState(Math.round(Date.now() / 1000))
  const [currentTime, setCurrentTime] = useState(Math.round(Date.now() / 1000))
  const isWindowVisible = useWindowVisibility()

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isWindowVisible) {
        return
      }

      const nextCurrentTime = Math.round(Date.now() / 1000)
      if (nextCurrentTime - state.lastUpdate > 300 && nextCurrentTime - openTime > 30) {
        // trigger a re-fetch
        window.location.reload()
      }
      setCurrentTime(nextCurrentTime)
    }, 1000)

    return () => clearInterval(interval)
  }, [isWindowVisible, openTime, state.lastUpdate])

  return (
    <div className={classes.statusBlock}>
      <Center className={classes.iconWrap}>{icon}</Center>
      <Title className={classes.statusTitle} order={1}>
        {statusString}
      </Title>
      <Title className={classes.updateText} order={5}>
        最后更新：
        {`${new Date(state.lastUpdate * 1000).toLocaleString('zh-CN', { hour12: false })}（${formatElapsed(currentTime - state.lastUpdate)}前）`}
      </Title>
    </div>
  )
}
