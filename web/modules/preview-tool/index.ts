import type { Exif } from '@modules/exiftool/interface'
import type { IConfig } from '@web/main/interface'
import type { IImgFileInfo } from '@web/modules/text-tool/interface'
import { TextTool } from '@web/modules/text-tool'
import { createCanvas, loadImage } from '@web/util/util'

interface PreviewToolOption {
  filePath: string
  exif: Exif
  config: IConfig
  logoPath: string
  maxSize?: number
}

interface LayoutInfo {
  bgW: number
  bgH: number
  mainW: number
  mainH: number
  mainLeft: number
  mainTop: number
  contentH: number
  textBottomOffset: number
}

export class PreviewTool {
  private readonly opt: PreviewToolOption

  constructor(opt: PreviewToolOption) {
    this.opt = {
      maxSize: 720,
      ...opt,
    }
  }

  async genPreview() {
    const img = await loadImage(this.opt.filePath)
    const baseLayout = this.calcBaseLayout(img.width, img.height)
    const textImgList = await this.genTextImg(baseLayout.bgH)
    const layout = this.calcContentLayout(baseLayout, textImgList)

    const canvas = createCanvas(layout.bgW, layout.bgH)
    const ctx = canvas.getContext('2d')

    this.drawBg(ctx, canvas, img)
    this.drawMainImg(ctx, img, layout)
    await this.drawText(ctx, layout, textImgList)

    return canvas.toDataURL('image/jpeg', 0.82)
  }

  private calcBaseLayout(imgW: number, imgH: number): LayoutInfo {
    const opt = this.opt.config.options
    let resetW = imgW
    let resetH = imgH

    if (opt.bg_rate_show && opt.bg_rate.w && opt.bg_rate.h) {
      const rate = +opt.bg_rate.w / +opt.bg_rate.h

      if (imgW >= imgH) {
        resetH = Math.round(imgW / rate)
      }
      else {
        resetW = Math.round(imgH * rate)
      }
    }

    if (opt.landscape && resetW < resetH) {
      const nextW = resetH
      resetH = resetW
      resetW = nextW
    }

    let bgW = resetW
    let bgH = resetH
    const whRate = bgW / bgH
    const mainImgWidthRate = (opt.main_img_w_rate || 90) / 100

    if (imgW / bgW > mainImgWidthRate) {
      bgW = Math.ceil(imgW / mainImgWidthRate)
      bgH = Math.ceil(bgW / whRate)
    }

    const scale = Math.min(1, this.opt.maxSize / Math.max(bgW, bgH))
    bgW = Math.max(1, Math.round(bgW * scale))
    bgH = Math.max(1, Math.round(bgH * scale))

    const mainW = Math.max(1, Math.round(imgW * scale))
    const mainH = Math.max(1, Math.round(imgH * scale))

    return {
      bgW,
      bgH,
      mainW,
      mainH,
      mainLeft: Math.round((bgW - mainW) / 2),
      mainTop: 0,
      contentH: mainH,
      textBottomOffset: 0,
    }
  }

  private calcContentLayout(baseLayout: LayoutInfo, textImgList: IImgFileInfo[]): LayoutInfo {
    const opt = this.opt.config.options
    const bgHeight = baseLayout.bgH
    const mainImgTopOffset = bgHeight * (opt.mini_top_bottom_margin / 100)
    const textBottomOffset = bgHeight * 0.027

    let contentTop = Math.ceil(mainImgTopOffset)
    let mainImgOffset = contentTop * 2

    if (opt.shadow_show) {
      const shadowHeight = Math.ceil(baseLayout.mainH * ((opt.shadow || 0) / 100))
      contentTop = Math.max(contentTop, Math.ceil(shadowHeight))
      mainImgOffset = contentTop * 2
    }

    if (textImgList.length) {
      mainImgOffset *= 3 / 4
      mainImgOffset += textBottomOffset
    }

    const textH = textImgList.reduce((n, i) => n + i.h, 0)
    const contentH = Math.ceil(textH + baseLayout.mainH + mainImgOffset)
    const whRate = baseLayout.bgW / baseLayout.bgH
    let bgH = contentH
    let bgW = Math.ceil(bgH * whRate)
    const mainImgWidthRate = (opt.main_img_w_rate || 90) / 100

    if (baseLayout.mainW / bgW > mainImgWidthRate) {
      bgW = Math.ceil(baseLayout.mainW / mainImgWidthRate)
      bgH = Math.ceil(bgW / whRate)
    }

    return {
      ...baseLayout,
      bgW,
      bgH,
      mainLeft: Math.round((bgW - baseLayout.mainW) / 2),
      mainTop: contentTop + Math.round((bgH - contentH) / 2),
      contentH,
      textBottomOffset,
    }
  }

  private async genTextImg(bgHeight: number) {
    const tool = new TextTool(this.opt.exif || {} as Exif, {
      exif: this.opt.exif || {} as Exif,
      bgHeight,
      options: this.opt.config.options,
      fields: [...this.opt.config.tempFields, ...this.opt.config.customTempFields],
      temps: this.opt.config.temps,
      logoPath: this.opt.logoPath,
    })

    return tool.genTextImg()
  }

  private drawBg(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, img: HTMLImageElement) {
    const opt = this.opt.config.options

    if (opt.solid_bg) {
      ctx.fillStyle = opt.solid_color || '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      return
    }

    ctx.save()
    ctx.filter = `blur(${Math.ceil(24 * ((opt.bg_blur || 100) / 100))}px)`
    const blurOffset = 36
    ctx.drawImage(img, -blurOffset, -blurOffset, canvas.width + blurOffset * 2, canvas.height + blurOffset * 2)
    ctx.restore()

    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  private drawMainImg(ctx: CanvasRenderingContext2D, img: HTMLImageElement, layout: LayoutInfo) {
    const opt = this.opt.config.options
    const radius = opt.radius_show
      ? Math.ceil(layout.mainH * ((opt.radius || 2.1) / 100))
      : 0

    ctx.save()

    if (opt.shadow_show) {
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
      ctx.shadowBlur = Math.ceil(layout.mainH * ((opt.shadow || 6) / 100))
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)'
    }

    this.roundRect(ctx, layout.mainLeft, layout.mainTop, layout.mainW, layout.mainH, radius)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
    ctx.fill()
    ctx.clip()
    ctx.shadowBlur = 0
    ctx.drawImage(img, layout.mainLeft, layout.mainTop, layout.mainW, layout.mainH)
    ctx.restore()
  }

  private async drawText(ctx: CanvasRenderingContext2D, layout: LayoutInfo, textImgList: IImgFileInfo[]) {
    let top = layout.bgH

    for (let i = textImgList.length - 1; i >= 0; i--) {
      const textImg = textImgList[i]
      const img = await loadImage(textImg.data)
      top -= textImg.h
      ctx.drawImage(img, Math.round((layout.bgW - textImg.w) / 2), Math.round(top), textImg.w, textImg.h)
    }
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    const radius = Math.max(0, Math.min(r, w / 2, h / 2))

    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + w - radius, y)
    ctx.arcTo(x + w, y, x + w, y + radius, radius)
    ctx.lineTo(x + w, y + h - radius)
    ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius)
    ctx.lineTo(x + radius, y + h)
    ctx.arcTo(x, y + h, x, y + h - radius, radius)
    ctx.lineTo(x, y + radius)
    ctx.arcTo(x, y, x + radius, y, radius)
    ctx.closePath()
  }
}
