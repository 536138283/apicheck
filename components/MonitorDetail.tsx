import { Text, Tooltip } from '@mantine/core'
import { MonitorState, MonitorTarget } from '@/uptime.types'
import { IconAlertCircle, IconCircleCheck } from '@tabler/icons-react'
import DetailChart from './DetailChart'
import DetailBar from './DetailBar'
import { getColor } from '@/util/color'

function calculateAvailabilityPercent(
  incidents: MonitorState['incident'][string],
  monitorStartTime: number,
  currentTime: number
) {
  const totalTime = currentTime - monitorStartTime
  if (totalTime <= 0) return '100.0'

  let downTime = 0
  for (const incident of incidents) {
    downTime += (incident.end ?? currentTime) - incident.start[0]
  }

  return (((totalTime - downTime) / totalTime) * 100).toPrecision(4)
}

export default function MonitorDetail({
  monitor,
  state,
}: {
  monitor: MonitorTarget
  state: MonitorState
}) {
  if (!state.latency[monitor.id] || !state.incident[monitor.id])
    return (
      <>
        <Text mt="sm" fw={700}>
          {monitor.name}
        </Text>
        <Text mt="sm" fw={700}>
          This monitor is configured on the status page, but no KV history exists for it yet.
          Redeploy the Worker with the latest config, wait for one scheduled check, and then refresh
          the page.
        </Text>
      </>
    )

  const statusIcon =
    state.incident[monitor.id].slice(-1)[0].end === undefined ? (
      <IconAlertCircle style={{ width: '1.25em', height: '1.25em', color: '#b91c1c' }} />
    ) : (
      <IconCircleCheck style={{ width: '1.25em', height: '1.25em', color: '#059669' }} />
    )

  const currentTime = Date.now() / 1000
  const monitorStartTime = state.incident[monitor.id][0].start[0]
  const slaPercent = calculateAvailabilityPercent(
    state.incident[monitor.id],
    monitorStartTime,
    currentTime
  )
  const targetSlaPercent = monitor.sla === undefined ? undefined : monitor.sla.toPrecision(4)

  // Conditionally render monitor name with or without hyperlink based on monitor.url presence
  const monitorNameElement = (
    <Text mt="sm" fw={700} style={{ display: 'inline-flex', alignItems: 'center' }}>
      {monitor.statusPageLink ? (
        <a
          href={monitor.statusPageLink}
          target="_blank"
          style={{ display: 'inline-flex', alignItems: 'center', color: 'inherit' }}
        >
          {statusIcon} {monitor.name}
        </a>
      ) : (
        <>
          {statusIcon} {monitor.name}
        </>
      )}
    </Text>
  )

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {monitor.tooltip ? (
          <Tooltip label={monitor.tooltip}>{monitorNameElement}</Tooltip>
        ) : (
          monitorNameElement
        )}

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Text mt="sm" fw={700} style={{ display: 'inline', color: getColor(slaPercent, true) }}>
            SLA: {slaPercent}%
          </Text>
          {targetSlaPercent && (
            <Text
              mt="sm"
              fw={700}
              style={{ display: 'inline', color: getColor(targetSlaPercent, true) }}
            >
              Target: {targetSlaPercent}%
            </Text>
          )}
        </div>
      </div>

      <DetailBar monitor={monitor} state={state} />
      <DetailChart monitor={monitor} state={state} />
    </>
  )
}
