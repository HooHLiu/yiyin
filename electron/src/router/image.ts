import { ExifTool } from '@modules/exiftool'
import { ImageTool } from '@modules/image-tool'
import { Router } from '@modules/router'
import routerConfig from '@root/router-config'
import { mainApp } from '@src/common/app'
import { genMainImgShadowQueue, genTextImgQueue, imageToolQueue } from '@src/common/queue'
import { config } from '@src/config'
import { cpObj } from '@utils'

const r = new Router()

interface StartTaskData {
  path: string
  name: string
}

interface ImgInfo {
  id: string
  path: string
  name: string
}

interface PreviewData extends StartTaskData {
  config: typeof config
  maxSize?: number
}

r.listen<StartTaskData[], ImgInfo[]>(routerConfig.addTask, async (fileUrlList) => {
  const imgList: ImgInfo[] = []

  for (const fileInfo of fileUrlList) {
    const tool = new ImageTool(fileInfo.path, fileInfo.name, {
      cachePath: config.cacheDir,
      outputOption: cpObj(config.options),
      outputPath: cpObj(config.output),
    })

    tool.on('progress', (id, progress) => {
      mainApp.win.webContents.send(routerConfig.on.progress, { id, progress })
    })
    imgList.push({ id: tool.id, ...fileInfo })
    imageToolQueue.add(tool)
  }

  return imgList
})

r.listen<void, boolean>(routerConfig.startTask, async () => {
  imageToolQueue.run()
  return true
})

r.listen(routerConfig.drainQueue, async () => imageToolQueue.drain())

r.listen<PreviewData, string>(routerConfig.genPreview, async (data) => {
  const previewConfig = data.config || config
  const tool = new ImageTool(data.path, data.name, {
    cachePath: config.cacheDir,
    outputOption: cpObj(previewConfig.options),
    outputPath: config.cacheDir,
    preview: true,
    previewMaxSize: data.maxSize || 720,
    config: {
      options: cpObj(previewConfig.options),
      tempFields: cpObj(previewConfig.tempFields),
      customTempFields: cpObj(previewConfig.customTempFields),
      temps: cpObj(previewConfig.temps),
    },
  })

  return tool.genPreview()
})

r.listen(routerConfig.genTextImg, async (data: any) => genTextImgQueue.add(data))

r.listen(routerConfig.genMainImgShadow, async (data: any) => genMainImgShadowQueue.add(data))

r.listen<string>(routerConfig.getExitInfo, async (imgPath) => {
  const tool = new ExifTool(imgPath)
  return tool.parse()
})

export default r
