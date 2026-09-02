import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('academicOS', {
  canvas: {
    connect: () => ipcRenderer.invoke('canvas:connect'),
    status: () => ipcRenderer.invoke('canvas:status'),
  },
  credentials: {
    set: (key: string, value: string) => ipcRenderer.invoke('credential:set', key, value),
    has: (key: string) => ipcRenderer.invoke('credential:has', key),
  },
})
