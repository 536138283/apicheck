import { MonitorState, StatusPageMonitor } from '@/uptime.types'
import { Center } from '@mantine/core'
import MonitorDetail from './MonitorDetail'
import classes from '@/styles/Monitor.module.css'

export default function MonitorList({
  monitors,
  state,
}: {
  monitors: StatusPageMonitor[]
  state: MonitorState | null | undefined
}) {
  return (
    <Center className={classes.listCenter}>
      <div className={classes.listPanel}>
        {monitors.map((monitor) => (
          <div key={monitor.id} className={classes.monitorItem}>
            <MonitorDetail monitor={monitor} state={state} />
          </div>
        ))}
      </div>
    </Center>
  )
}
