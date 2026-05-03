import { useRef, useState, useCallback, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { rgbToMunsell, rgbToMunsellExact, chromaDescription, valueDescription, samplePixels, labToRgb, munsellHvcToRgb } from '../lib/munsell'
import { initGL, uploadImage as glUploadImage, updateLUT as glUpdateLUT, runDevelop as glRunDevelop, runValueGroups as glRunValueGroups, runChromaGroups as glRunChromaGroups, uploadColorGroups as glUploadColorGroups, runMatchMask as glRunMatchMask, drawMatchOverlay as glDrawMatchOverlay } from '../lib/developGL'
import Filters, { FILTERS } from '../components/Filters'
import Palette from '../components/Palette'
import GridOverlay from '../components/GridOverlay'
import MunsellChart from '../components/MunsellChart'
import { CurvesEditor, makeIdentityCurve } from '../components/Curves'
import styles from '../styles/Home.module.css'

const DEFAULT_COLOR = {
  r: null, g: null, b: null,
  hue: '—', hueName: '—', hueAngle: 0,
  value: null, chroma: null
}

function devTicks(min, max) {
  const range = max - min
  const count = 20
  const ticks = []
  for (let i = 0; i <= count; i++) {
    const pct = (i / count) * 100
    const isMain = i % 5 === 0
    ticks.push(
      <div key={i} style={{
        position: 'absolute',
        left: `${pct}%`,
        top: 0,
        width: 1,
        height: isMain ? 6 : 2,
        background: isMain ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.18)',
        transform: 'translateX(-50%)',
      }} />
    )
  }
  return ticks
}

function DevSlider({ k, label, min, max, step=0.5, fmt, develop, setDevelop }) {
  const v = develop[k]
  const display = fmt ? fmt(v) : `${v > 0 ? '+' : ''}${Number.isInteger(v) ? v : v.toFixed(1)}`
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
        <span style={{ fontSize: 10, color: '#8a8680', fontFamily: 'monospace', width: 66, flexShrink: 0 }}>{label}</span>
        <span style={{ fontSize: 12, fontFamily: 'monospace', minWidth: 44, textAlign: 'center', color: v !== 0 ? '#e8e0d0' : '#666260', lineHeight: 1 }}>
          {display}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 66, flexShrink: 0 }} />
        <div style={{ flex: 1, position: 'relative', height: 8 }}>
          {devTicks(min, max)}
          <input type="range" min={min} max={max} step={step} value={v}
            onChange={e => setDevelop(d => ({ ...d, [k]: Number(e.target.value) }))}
            className={styles.slider} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', margin: 0 }} />
        </div>
        <span style={{ width: 44 }} />
      </div>
    </div>
  )
}

function AccordionDrawer({ title, isOpen, onToggle, children, noToggle }) {
  return (
    <div className={styles.drawer}>
      <button className={styles.drawerHeader} onClick={noToggle ? undefined : onToggle}
        style={noToggle ? { cursor: 'default', pointerEvents: 'none' } : {}}>
        <span className={styles.drawerTitle}>{title}</span>
        {!noToggle && <span className={styles.drawerArrow}>{isOpen ? '▼' : '▶'}</span>}
      </button>
      {isOpen && <div className={styles.drawerBody}>{children}</div>}
    </div>
  )
}

function hslToRgb(h, s, l) {
  s /= 100; l /= 100
  const k = n => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) }
}

function parseMunsell(str) {
  const match = str.trim().match(/^(\d+\.?\d*\s*[A-Z]{1,2})\s+(\d+\.?\d*)\/(\d+\.?\d*)$/i)
  if (!match) return null
  return {
    hue: match[1].trim().toUpperCase(),
    value: parseFloat(match[2]),
    chroma: parseFloat(match[3]),
  }
}

function ColorPaletteGrid({ paletteClusters, paletteCount, paletteGridCols, onColorClick }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: paletteGridCols, gap: 3 }}>
      {(paletteClusters.length > 0
        ? [...paletteClusters].sort((a, b) => (b.count || 0) - (a.count || 0)).slice(0, paletteCount)
        : Array.from({ length: paletteCount }, () => null)
      ).map((c, i) => {
        const m = c ? rgbToMunsellExact(c.r, c.g, c.b) : null
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{
              width: '100%', height: paletteCount <= 8 ? 28 : paletteCount <= 12 ? 24 : 20,
              borderRadius: 3,
              background: c ? `rgb(${c.r},${c.g},${c.b})` : '#2a2a2a',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: c ? 'pointer' : 'default',
            }}
              onClick={() => { if (!c) return; onColorClick(c.r, c.g, c.b) }}
            />
            {paletteCount <= 12 && (
              <span style={{ fontSize: 8, color: '#555250', fontFamily: 'monospace', textAlign: 'center', lineHeight: 1.2 }}>
                {m ? `${m.hue}` : '—'}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

const CROSSHAIR_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Cline x1='16' y1='2' x2='16' y2='30' stroke='%23000' stroke-width='2'/%3E%3Cline x1='2' y1='16' x2='30' y2='16' stroke='%23000' stroke-width='2'/%3E%3Cline x1='16' y1='2' x2='16' y2='30' stroke='%23fff' stroke-width='1'/%3E%3Cline x1='2' y1='16' x2='30' y2='16' stroke='%23fff' stroke-width='1'/%3E%3C/svg%3E") 16 16, crosshair`

export default function Home() {
  const canvasRef = useRef(null)
  const canvasWrapRef = useRef(null)
  const fileInputRef = useRef(null)
  const originalImageDataRef = useRef(null)
  const workerRef = useRef(null)
  const filterDebounceRef = useRef(null)
  const dragRef = useRef(null)
  const touchRef = useRef(null)
  const minimapCanvasRef = useRef(null)
  const [image, setImage] = useState(null)
  const [imgDims, setImgDims] = useState({ w: 0, h: 0 })
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [cursor, setCursor] = useState({ x: 0, y: 0, visible: false })
  const [sampleRadius, setSampleRadius] = useState(3)
  const [dragging, setDragging] = useState(false)
  const [openDrawer, setOpenDrawer] = useState([])
  const [valueSteps, setValueSteps] = useState(10)
  const [showGray, setShowGray] = useState(false)
  const [chromaMode, setChromaMode] = useState(false)
  const [minimapTrigger, setMinimapTrigger] = useState(0)
  const [valueRating, setValueRating] = useState(null)
  const [palette, setPalette] = useState([])
  const [paletteCount, setPaletteCount] = useState(6)
  const [hoverMunsell, setHoverMunsell] = useState(null)
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 })
  const [loupeData, setLoupeData] = useState(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const loupeCanvasRef = useRef(null)
  const [selectedSwatch, setSelectedSwatch] = useState(null)
  const [gridMode, setGridMode] = useState(null)
  const [squareGridSize, setSquareGridSize] = useState(4)
  const [showDiagonals, setShowDiagonals] = useState(false)
  const [gridColor, setGridColor] = useState('#ffffff')
  const [gridOpacity, setGridOpacity] = useState(90)
  const [activeFilter, setActiveFilter] = useState(null)
  const [filterStrength, setFilterStrength] = useState(5)
  const [channelCurves, setChannelCurves] = useState({
    R: makeIdentityCurve(), G: makeIdentityCurve(), B: makeIdentityCurve(), Luminosity: makeIdentityCurve(),
    Rpts: [{in:0,out:0},{in:255,out:255}], Gpts: [{in:0,out:0},{in:255,out:255}],
    Bpts: [{in:0,out:0},{in:255,out:255}], Luminositypts: [{in:0,out:0},{in:255,out:255}],
    activeChannel: 'Luminosity',
  })
  const [duotoneColors, setDuotoneColors] = useState({ colorA: '#ff6b35', colorB: '#2d1b69' })
  const [viewport, setViewport] = useState({ zoom: 1, panX: 0, panY: 0 })
  const [canvasBg, setCanvasBg] = useState('#222222')
  const [wrapSz, setWrapSz] = useState({ w: 0, h: 0 })
  const [clickPos, setClickPos] = useState(null)
  const [clickImagePos, setClickImagePos] = useState(null)
  const [munsellInput, setMunsellInput] = useState('')
  const [munsellPreview, setMunsellPreview] = useState(null)
  const [showColorOverlay, setShowColorOverlay] = useState(false)
  const [colorOverlayView, setColorOverlayView] = useState('munsell') // 'munsell' | 'rgb'
  const [compGray, setCompGray] = useState(3)
  const [valueSoften, setValueSoften] = useState(0)
  const valueTouchedRef = useRef(false)
  const [colorSteps, setColorSteps] = useState(30)
  const [colorSoften, setColorSoften] = useState(0)
  const colorTouchedRef = useRef(false) // true after user first drags the slider
  const [chromaSteps, setChromaSteps] = useState(12)
  const [chromaSoften, setChromaSoften] = useState(0)
  const chromaTouchedRef = useRef(false)
  const [colorActive, setColorActive] = useState(false) // color groups on/off
  const [colorRating, setColorRating] = useState(null)
  const [colorClusters, setColorClusters] = useState([])
  const colorWorkerRef = useRef(null)
  const [paletteClusters, setPaletteClusters] = useState([])
  const [loupeMode, setLoupeMode] = useState(true)
  const [showMunsellValues, setShowMunsellValues] = useState(true)
  const [showMinimap, setShowMinimap] = useState(true)
  const chartPanelRef = useRef(null)
  const [matchColor, setMatchColor] = useState(null)
  const [matchPixels, setMatchPixels] = useState([])
  const [matchMode, setMatchMode] = useState(false)
  const DEVELOP_DEFAULTS = { temperature:0, tint:0, exposure:0, contrast:0, highlights:0, shadows:0, whites:0, blacks:0, sharpen:0, vignette:0, noise:0, texture:0, clarity:0, dehaze:0, vibrance:0, saturation:0 }
  const [develop, setDevelop] = useState(DEVELOP_DEFAULTS)
  const [lutData, setLutData] = useState(null)   // Float32Array | null
  const [lutSize, setLutSize] = useState(0)
  const [lutName, setLutName] = useState('')
  const [lutIntensity, setLutIntensity] = useState(100)

  const applyValueGroupsRef = useRef(null)
  const paletteWorkerRef = useRef(null)
  const developWorkerRef = useRef(null)
  const developGenRef = useRef(0)
  const colorDebounceRef = useRef(null)
  const valueDebounceRef = useRef(null)
  const chromaDebounceRef = useRef(null)
  const lutFileRef = useRef(null)
  const glCanvasRef = useRef(null)
  const glStateRef = useRef(null)

  // Munsell neutrals N8/ → N2/ (perceptually uniform), N5/ in centre (index 3)
  const grayTones = ['#c6c6c6', '#aaaaaa', '#8f8f8f', '#737373', '#565656', '#3b3b3b', '#252525']

  const bgColors = ['#ffffff', '#cccccc', '#999999', '#666666', '#444444', '#222222', '#111111']

  const toggleDrawer = (name) => setOpenDrawer(prev =>
    prev.includes(name) ? prev.filter(d => d !== name) : [...prev, name]
  )

  const loadFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        setImage(img)
        setImgDims({ w: img.width, h: img.height })
        setColor(DEFAULT_COLOR)
        setShowGray(false)
        setValueRating(null)
        setActiveFilter(null)
        setViewport({ zoom: 1, panX: 0, panY: 0 })
        setClickPos(null)
        setClickImagePos(null)
        setColorActive(false)
        setColorRating(null)
        setColorClusters([])
        setPaletteClusters([])
        setLoupeMode(false)
        setShowMunsellValues(false)
        setMatchColor(null)
        setMatchPixels([])
        setMatchMode(false)
        setColorSteps(30)
        setColorSoften(0)
        colorTouchedRef.current = false
        valueTouchedRef.current = false
        chromaTouchedRef.current = false
        setDevelop(DEVELOP_DEFAULTS)
        setTimeout(() => {
          const canvas = canvasRef.current
          if (canvas) {
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d', { willReadFrequently: true })
            ctx.drawImage(img, 0, 0)
            originalImageDataRef.current = ctx.getImageData(0, 0, img.width, img.height)
            if (glStateRef.current) glUploadImage(glStateRef.current, img)
            const src = originalImageDataRef.current
            const buffer = new Uint8ClampedArray(src.data).buffer
            if (paletteWorkerRef.current) paletteWorkerRef.current.terminate()
            paletteWorkerRef.current = new Worker('/filterWorker.js')
            paletteWorkerRef.current.onmessage = (e) => {
              setPaletteClusters(e.data.clusters || [])
              paletteWorkerRef.current = null
            }
            paletteWorkerRef.current.postMessage(
              { filter: 'kmeans-analyze', strength: 24, buffer, width: src.width, height: src.height },
              [buffer]
            )
          }
        }, 50)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    loadFile(e.dataTransfer.files[0])
  }, [loadFile])

  const lastImgPosRef = useRef(null)

  const sampleAt = useCallback((px, py, radius) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const imageData = ctx.getImageData(0, 0, imgDims.w, imgDims.h)
    const { r, g, b } = samplePixels(imageData, px, py, radius, imgDims.w, imgDims.h)
    setColor({ r, g, b, ...rgbToMunsellExact(r, g, b) })
  }, [imgDims])

  const findMatchingPixels = useCallback((refH, refV, refC, refImg, sampleRate = 4) => {
    if (!refImg) return { count: 0, positions: [] }
    const { width, height, data } = refImg
    const positions = []
    for (let y = 0; y < height; y += sampleRate) {
      for (let x = 0; x < width; x += sampleRate) {
        const i = (y * width + x) * 4
        const m = rgbToMunsell(data[i], data[i+1], data[i+2])
        if (
          Math.abs(m.hueAngle - refH) <= 1 &&
          Math.abs(m.value - refV) <= 0.15 &&
          Math.abs(m.chroma - refC) <= 0.8
        ) {
          positions.push({ x, y })
        }
      }
    }
    return { count: positions.length * sampleRate * sampleRate, positions }
  }, [])

  const handlePixelMatch = useCallback((px, py) => {
    try {
      const imgData = originalImageDataRef.current
      if (!imgData) return
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return
      const imageData = ctx.getImageData(0, 0, imgData.width, imgData.height)
      const { r, g, b } = samplePixels(imageData, px, py, sampleRadius, imgData.width, imgData.height)
      const m = rgbToMunsell(r, g, b)
      setMatchColor({ ...m, r, g, b })
      const result = findMatchingPixels(m.hueAngle, m.value, m.chroma, imgData)
      setMatchPixels(result.positions)
    } catch (err) {
      console.warn('handlePixelMatch error:', err)
    }
  }, [findMatchingPixels, sampleRadius])

  // Called from the match-mode button — runs GPU search on originalImageDataRef
  const triggerPixelMatch = useCallback(() => {
    const last = lastImgPosRef.current
    if (!last || !image) return
    const imgData = originalImageDataRef.current
    if (!imgData) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    const imageData = ctx.getImageData(0, 0, imgData.width, imgData.height)
    const { r, g, b } = samplePixels(imageData, last.px, last.py, sampleRadius, imgData.width, imgData.height)
    const m = rgbToMunsell(r, g, b)
    setMatchColor({ ...m, r, g, b })
    const gl = glStateRef.current
    if (!gl) { console.warn('triggerPixelMatch: no gl'); return }
    setMatchPixels([])
    const positions = glRunMatchMask(gl, r, g, b, 1.0, 0.5)
    setMatchPixels(positions)
    console.warn('triggerPixelMatch:', positions.length, 'positions, first:', JSON.stringify(positions[0]))
    // Diagnostic: draw mask directly on canvas to see if WebGL positions are correct
    glDrawMatchOverlay(gl, r, g, b, 30.0)
  }, [image, sampleRadius])

  const handleMunsellInput = useCallback((str) => {
    try {
      const parsed = parseMunsell(str)
      if (!parsed) { console.warn('parseMunsell returned null for:', str); return }
      const rgb = munsellHvcToRgb(parsed.hue, parsed.value, parsed.chroma)
      if (!rgb) { console.warn('munsellHvcToRgb returned null for:', parsed); return }
      setMunsellPreview({ ...parsed, ...rgb })
      // Set color state so all panels update
      const munsell = rgbToMunsell(rgb.r, rgb.g, rgb.b)
      setColor({ r: rgb.r, g: rgb.g, b: rgb.b, ...munsell })
    } catch (e) {
      console.error('handleMunsellInput error:', e)
    }
  }, [])

  const sampleColor = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = imgDims.w / rect.width
    const scaleY = imgDims.h / rect.height
    const px = Math.floor((e.clientX - rect.left) * scaleX)
    const py = Math.floor((e.clientY - rect.top) * scaleY)
    if (px < 0 || py < 0 || px >= imgDims.w || py >= imgDims.h) return
    lastImgPosRef.current = { px, py }
    sampleAt(px, py, sampleRadius)
    setClickPos({ x: (e.clientX - rect.left) / viewport.zoom, y: (e.clientY - rect.top) / viewport.zoom })
    const wrap = canvasWrapRef.current
    if (wrap) {
      const wr = wrap.getBoundingClientRect()
      const sx = e.clientX - wr.left - wr.width / 2
      const sy = e.clientY - wr.top - wr.height / 2
      setClickImagePos({ x: (sx - viewport.panX) / viewport.zoom, y: (sy - viewport.panY) / viewport.zoom })
    }
  }, [imgDims, sampleRadius, sampleAt, viewport.zoom, viewport.panX, viewport.panY])

  const handleCanvasMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPanX: viewport.panX,
      startPanY: viewport.panY,
      moved: false,
    }
  }, [viewport.panX, viewport.panY])

  const handleCanvasMouseUp = useCallback((e) => {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag || e.button !== 0) return
    if (!drag.moved) sampleColor(e)
  }, [sampleColor])

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length !== 1) { touchRef.current = null; return }
    const t = e.touches[0]
    touchRef.current = { startX: t.clientX, startY: t.clientY, startPanX: viewport.panX, startPanY: viewport.panY, moved: false }
  }, [viewport.panX, viewport.panY])

  const handleTouchMove = useCallback((e) => {
    if (!touchRef.current || e.touches.length !== 1) return
    e.preventDefault()
    const t = e.touches[0]
    const dx = t.clientX - touchRef.current.startX
    const dy = t.clientY - touchRef.current.startY
    if (!touchRef.current.moved && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) touchRef.current.moved = true
    if (touchRef.current.moved) setViewport(v => ({ ...v, panX: touchRef.current.startPanX + dx, panY: touchRef.current.startPanY + dy }))
  }, [])

  const handleTouchEnd = useCallback((e) => {
    const touch = touchRef.current
    touchRef.current = null
    if (!touch || touch.moved) return
    const t = e.changedTouches[0]
    sampleColor({ clientX: t.clientX, clientY: t.clientY })
    const rect = canvasRef.current?.getBoundingClientRect()
    if (rect) {
      const scaleX = imgDims.w / rect.width
      const scaleY = imgDims.h / rect.height
      const px = Math.floor((t.clientX - rect.left) * scaleX)
      const py = Math.floor((t.clientY - rect.top) * scaleY)
      if (px >= 0 && py >= 0 && px < imgDims.w && py < imgDims.h) handlePixelMatch(px, py)
    }
  }, [sampleColor, handlePixelMatch, imgDims])

  const handleMouseMove = useCallback((e) => {
    const drag = dragRef.current
    if (drag) {
      const dx = e.clientX - drag.startX
      const dy = e.clientY - drag.startY
      if (!drag.moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) drag.moved = true
      if (drag.moved) {
        setViewport(v => ({ ...v, panX: drag.startPanX + dx, panY: drag.startPanY + dy }))
      }
      return
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()

    // Image pixel coordinates — account for centering offset and pan
    const visualX = e.clientX - rect.left
    const visualY = e.clientY - rect.top
    const centerOffsetX = (rect.width - imgDims.w * viewport.zoom) / 2
    const centerOffsetY = (rect.height - imgDims.h * viewport.zoom) / 2
    const innerX = visualX - centerOffsetX
    const innerY = visualY - centerOffsetY
    const imgX = Math.floor((innerX - viewport.panX) / viewport.zoom)
    const imgY = Math.floor((innerY - viewport.panY) / viewport.zoom)
    const imgW = originalImageDataRef.current?.width || 0
    const imgH = originalImageDataRef.current?.height || 0
    if (imgX >= 0 && imgX < imgW && imgY >= 0 && imgY < imgH && image) {
      const i = (imgY * imgW + imgX) * 4
      const r = originalImageDataRef.current.data[i]
      const g = originalImageDataRef.current.data[i + 1]
      const b = originalImageDataRef.current.data[i + 2]
      const m = rgbToMunsell(r, g, b)
      const munsellStr = `${m.hue} ${m.value.toFixed(1)}/${m.chroma.toFixed(1)}`
      setHoverMunsell({ munsellStr, r, g, b })
      setHoverPos({ x: visualX, y: visualY })

      // Loupe: 20x20px crop in image space → 100x100 canvas on screen
      const loupeCtx = loupeCanvasRef.current?.getContext('2d')
      if (loupeCtx && canvas) {
        loupeCtx.clearRect(0, 0, 100, 100)
        loupeCtx.imageSmoothingEnabled = false
        loupeCtx.drawImage(canvas, imgX - 20, imgY - 20, 40, 40, 0, 0, 100, 100)
      }

      mouseRef.current = { x: e.clientX, y: e.clientY }
      const parts = munsellStr.match(/^([^\s]+)\s+([\d.]+)\/([\d.]+)/)
      const munsellChip = parts ? munsellHvcToRgb(parts[1], parseFloat(parts[2]), parseFloat(parts[3])) : null
      setLoupeData({ x: e.clientX, y: e.clientY, munsellStr, r, g, b, munsellChip })
    } else {
      setHoverMunsell(null)
      setLoupeData(null)
      setHoverPos({ x: 0, y: 0 })
    }
  }, [viewport.zoom, image])

  useEffect(() => {
    const el = canvasWrapRef.current
    if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const cx = e.clientX - rect.left - rect.width / 2
      const cy = e.clientY - rect.top - rect.height / 2
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
      setViewport(v => {
        const newZoom = Math.min(Math.max(v.zoom * factor, 0.25), 12)
        const r = newZoom / v.zoom
        return { zoom: newZoom, panX: cx * (1 - r) + v.panX * r, panY: cy * (1 - r) + v.panY * r }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [image])

  useEffect(() => {
    const el = canvasWrapRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setWrapSz({ w: width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [image])

  useEffect(() => {
    const mc = minimapCanvasRef.current
    const c = canvasRef.current
    if (!mc || !c) return
    const draw = () => {
      try {
        const ctx = mc.getContext('2d')
        ctx.clearRect(0, 0, mc.width, mc.height)
        ctx.drawImage(c, 0, 0, mc.width, mc.height)
      } catch (e) { /* canvas not ready */ }
    }
    let raf
    const loop = () => { draw(); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [image, minimapTrigger])

  // Sync LUT to GL state whenever it changes
  useEffect(() => {
    if (glStateRef.current) glUpdateLUT(glStateRef.current, lutData, lutSize)
  }, [lutData, lutSize])

  // Init WebGL develop pipeline once on mount; fall back to persistent worker if unavailable
  useEffect(() => {
    if (!glCanvasRef.current) return
    const state = initGL(glCanvasRef.current)
    if (state) {
      glStateRef.current = state
    } else {
      const w = new Worker('/filterWorker.js')
      developWorkerRef.current = w
      return () => { w.terminate(); developWorkerRef.current = null }
    }
  }, [])

  const applyValueGroups = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !originalImageDataRef.current) return
    const gl = glStateRef.current
    if (gl && gl.w > 1) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      glRunValueGroups(gl, valueSteps, valueSoften, ctx)
    } else {
      // CPU fallback
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      const imageData = new ImageData(
        new Uint8ClampedArray(originalImageDataRef.current.data),
        originalImageDataRef.current.width,
        originalImageDataRef.current.height
      )
      const data = imageData.data
      for (let i = 0; i < data.length; i += 4) {
        const lum = 0.2126 * data[i] + 0.7152 * data[i+1] + 0.0722 * data[i+2]
        const group = Math.min(valueSteps - 1, Math.floor((lum / 255) * valueSteps))
        const grayVal = Math.round((0.02 + (group / (valueSteps - 1)) * 0.98) * 255)
        data[i] = data[i+1] = data[i+2] = grayVal
      }
      ctx.putImageData(imageData, 0, 0)
    }
    setShowGray(true)
    if (valueSteps <= 4) setValueRating('green')
    else if (valueSteps <= 7) setValueRating('yellow')
    else setValueRating('red')
  }, [valueSteps, valueSoften])
  applyValueGroupsRef.current = applyValueGroups

  const applyOriginalBW = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !originalImageDataRef.current) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const imageData = new ImageData(
      new Uint8ClampedArray(originalImageDataRef.current.data),
      originalImageDataRef.current.width,
      originalImageDataRef.current.height
    )
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      const lum = Math.round(0.2126 * data[i] + 0.7152 * data[i+1] + 0.0722 * data[i+2])
      data[i] = data[i+1] = data[i+2] = lum
    }
    ctx.putImageData(imageData, 0, 0)
    setShowGray(true)
    setValueRating(null)
  }, [])

  const applyChromaMode = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !originalImageDataRef.current) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const imageData = new ImageData(
      new Uint8ClampedArray(originalImageDataRef.current.data),
      originalImageDataRef.current.width,
      originalImageDataRef.current.height
    )
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2]
      const R = r / 255, G = g / 255, B = b / 255
      const rl = R > 0.04045 ? Math.pow((R + 0.055) / 1.055, 2.4) : R / 12.92
      const gl = G > 0.04045 ? Math.pow((G + 0.055) / 1.055, 2.4) : G / 12.92
      const bl = B > 0.04045 ? Math.pow((B + 0.055) / 1.055, 2.4) : B / 12.92
      const x = rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375
      const y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750
      const z = rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041
      const Xn = 0.95047, Yn = 1.0, Zn = 1.08883
      const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116
      const fy = f(y / Yn)
      const L = 116 * fy - 16
      const a = 500 * (f(x / Xn) - fy)
      const bv = 200 * (fy - f(z / Zn))
      const chroma = Math.sqrt(a * a + bv * bv)
      const gray = Math.round(Math.min(255, (chroma / 60) * 255))
      data[i] = data[i+1] = data[i+2] = gray
    }
    ctx.putImageData(imageData, 0, 0)
    setChromaMode(true)
    setShowGray(false)
    setMinimapTrigger(t => t + 1)
    setValueRating(null)
  }, [])

  const applyChromaGroups = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !originalImageDataRef.current) return
    const gl = glStateRef.current
    if (gl && gl.w > 1) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      glRunChromaGroups(gl, chromaSteps, chromaSoften, ctx)
    } else {
      // CPU fallback
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      const imageData = new ImageData(
        new Uint8ClampedArray(originalImageDataRef.current.data),
        originalImageDataRef.current.width,
        originalImageDataRef.current.height
      )
      const data = imageData.data
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i+1], b = data[i+2]
        const R = r / 255, G = g / 255, B = b / 255
        const rl = R > 0.04045 ? Math.pow((R + 0.055) / 1.055, 2.4) : R / 12.92
        const gl2 = G > 0.04045 ? Math.pow((G + 0.055) / 1.055, 2.4) : G / 12.92
        const bl = B > 0.04045 ? Math.pow((B + 0.055) / 1.055, 2.4) : B / 12.92
        const x = rl * 0.4124564 + gl2 * 0.3575761 + bl * 0.1804375
        const y = rl * 0.2126729 + gl2 * 0.7151522 + bl * 0.0721750
        const z = rl * 0.0193339 + gl2 * 0.1191920 + bl * 0.9503041
        const Xn = 0.95047, Yn = 1.0, Zn = 1.08883
        const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116
        const fy = f(y / Yn)
        const a = 500 * (f(x / Xn) - fy)
        const bv = 200 * (fy - f(z / Zn))
        const chroma = Math.sqrt(a * a + bv * bv)
        const group = Math.min(chromaSteps - 1, Math.floor((chroma / 60) * chromaSteps))
        const grayVal = Math.round((0.02 + (group / (chromaSteps - 1)) * 0.98) * 255)
        data[i] = data[i+1] = data[i+2] = grayVal
      }
      ctx.putImageData(imageData, 0, 0)
    }
    setChromaMode(true)
    setShowGray(false)
    setMinimapTrigger(t => t + 1)
    setValueRating(null)
  }, [chromaSteps, chromaSoften])

  const applyColorGroups = useCallback(() => {
    if (!originalImageDataRef.current) return
    const src = originalImageDataRef.current
    const buffer = new Uint8ClampedArray(src.data).buffer
    const width = src.width
    const height = src.height
    if (colorWorkerRef.current) colorWorkerRef.current.terminate()
    colorWorkerRef.current = new Worker('/filterWorker.js')
    colorWorkerRef.current.onmessage = (e) => {
      const out = new Uint8ClampedArray(e.data.out)
      const gl = glStateRef.current
      if (gl) glUploadColorGroups(gl, out, width, height)
      // Immediately run develop pipeline to show reduced colors on canvas
      const ctx = canvasRef.current?.getContext('2d', { willReadFrequently: true })
      if (ctx && gl) glRunDevelop(gl, { ...develop, clarity: 0, texture: 0, lutIntensity }, ctx, gl.colorGroupsTex)
      setColorActive(true)
      setColorClusters(e.data.clusters || [])
      colorWorkerRef.current = null
    }
    colorWorkerRef.current.postMessage(
      { filter: 'kmeans', strength: colorSteps, soften: colorSoften, buffer, width, height },
      [buffer]
    )
  }, [colorSteps, colorSoften, develop, lutIntensity])

  // Real-time color groups: re-run k-means when slider changes — only after user touched
  useEffect(() => {
    if (!image || !colorTouchedRef.current) return
    clearTimeout(colorDebounceRef.current)
    colorDebounceRef.current = setTimeout(() => applyColorGroups(), 150)
    return () => clearTimeout(colorDebounceRef.current)
  }, [colorSteps, colorSoften, applyColorGroups, image])

  // Real-time value groups: re-run when slider changes — only after user touched
  useEffect(() => {
    if (!image || !valueTouchedRef.current) return
    clearTimeout(valueDebounceRef.current)
    valueDebounceRef.current = setTimeout(() => applyValueGroups(), 150)
    return () => clearTimeout(valueDebounceRef.current)
  }, [valueSteps, valueSoften, applyValueGroups, image])

  // Real-time chroma groups: re-run when slider changes — only after user touched
  useEffect(() => {
    if (!image || !chromaTouchedRef.current) return
    clearTimeout(chromaDebounceRef.current)
    chromaDebounceRef.current = setTimeout(() => applyChromaGroups(), 150)
    return () => clearTimeout(chromaDebounceRef.current)
  }, [chromaSteps, chromaSoften, applyChromaGroups, image])

  const resetCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !originalImageDataRef.current) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.putImageData(originalImageDataRef.current, 0, 0)
    setShowGray(false)
    setValueRating(null)
  }, [])

  const applyDevelop = useCallback((dev, lut = null, lsz = 0, lint = 100) => {
    const canvas = canvasRef.current
    const worker = developWorkerRef.current
    if (!canvas || !originalImageDataRef.current || !worker) return
    const gen = ++developGenRef.current
    const src = originalImageDataRef.current
    const buffer = src.data.slice().buffer
    worker.onmessage = (e) => {
      if (e.data.gen !== gen) return   // stale result — discard
      const out = new Uint8ClampedArray(e.data.out)
      canvas.getContext('2d', { willReadFrequently: true })
        .putImageData(new ImageData(out, src.width, src.height), 0, 0)
    }
    const msg = { filter: 'develop', gen, ...dev, buffer, width: src.width, height: src.height, lutSize: lsz, lutIntensity: lint }
    const transferables = [buffer]
    if (lut && lsz > 1) {
      const lutBuf = lut.slice().buffer
      msg.lutBuffer = lutBuf
      transferables.push(lutBuf)
    }
    worker.postMessage(msg, transferables)
  }, [])

  useEffect(() => {
    const gl = glStateRef.current
    // When Color Groups are active, always run develop pipeline (even if all sliders are 0)
    if (colorActive && gl && gl.w > 1) {
      const sourceTex = gl.colorGroupsTex
      const ctx = canvasRef.current?.getContext('2d', { willReadFrequently: true })
      if (ctx) glRunDevelop(gl, { ...develop, clarity: 0, texture: 0, lutIntensity }, ctx, sourceTex)
      return
    }
    const allZero = Object.values(develop).every(v => v === 0) && !lutData
    if (allZero) {
      const canvas = canvasRef.current
      if (canvas && originalImageDataRef.current)
        canvas.getContext('2d', { willReadFrequently: true }).putImageData(originalImageDataRef.current, 0, 0)
      return
    }
    const hasExpensive = develop.clarity !== 0 || develop.texture !== 0
    if (gl && gl.w > 1) {
      // GPU path — near-instantaneous, minimal debounce
      // Use colorGroupsTex when Color Groups are active, otherwise origTex
      const sourceTex = colorActive ? gl.colorGroupsTex : gl.origTex
      const t1 = setTimeout(() => {
        const ctx = canvasRef.current?.getContext('2d', { willReadFrequently: true })
        if (ctx) glRunDevelop(gl, { ...develop, clarity: 0, texture: 0, lutIntensity }, ctx, sourceTex)
      }, 0)
      const t2 = hasExpensive ? setTimeout(() => {
        const ctx = canvasRef.current?.getContext('2d', { willReadFrequently: true })
        if (ctx) glRunDevelop(gl, { ...develop, lutIntensity }, ctx, sourceTex)
      }, 50) : null
      return () => { clearTimeout(t1); if (t2) clearTimeout(t2) }
    } else {
      // Worker fallback
      const t1 = setTimeout(() => applyDevelop({ ...develop, clarity: 0, texture: 0 }, lutData, lutSize, lutIntensity), 40)
      const t2 = hasExpensive ? setTimeout(() => applyDevelop(develop, lutData, lutSize, lutIntensity), 600) : null
      return () => { clearTimeout(t1); if (t2) clearTimeout(t2) }
    }
  }, [develop, applyDevelop, lutData, lutSize, lutIntensity, colorActive])

  const applyFilter = useCallback((filter, strength, curvesData) => {
    const canvas = canvasRef.current
    if (!canvas || !originalImageDataRef.current) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!filter) {
      ctx.putImageData(originalImageDataRef.current, 0, 0)
      return
    }
    const src = originalImageDataRef.current
    const buffer = new Uint8ClampedArray(src.data).buffer
    if (workerRef.current) workerRef.current.terminate()
    workerRef.current = new Worker('/filterWorker.js')
    workerRef.current.onmessage = (e) => {
      const out = new Uint8ClampedArray(e.data.out)
      ctx.putImageData(new ImageData(out, src.width, src.height), 0, 0)
      workerRef.current = null
    }
    const msg = { filter, strength, buffer, width: src.width, height: src.height }
    if (filter === 'duotone') {
      msg.colorA = duotoneColors.colorA
      msg.colorB = duotoneColors.colorB
    }
    if (filter === 'curves' && curvesData) {
      msg.curves = curvesData
    }
    workerRef.current.postMessage(msg, [buffer])
  }, [duotoneColors])

  const handleFilterChange = useCallback((filter) => {
    setActiveFilter(filter)
    const cfg = FILTERS.find(f => f.id === filter)
    const strength = cfg?.def ?? filterStrength
    if (cfg?.def !== undefined) setFilterStrength(cfg.def)
    if (filter === 'duotone') {
      applyFilter(filter, 1)
    } else if (filter === 'curves') {
      applyFilter(filter, 0, channelCurves)
    } else {
      applyFilter(filter, strength)
    }
  }, [applyFilter, filterStrength, channelCurves])

  const handleDuotoneColorsChange = useCallback((colorA, colorB) => {
    const updated = {
      colorA: colorA !== null ? colorA : duotoneColors.colorA,
      colorB: colorB !== null ? colorB : duotoneColors.colorB,
    }
    setDuotoneColors(updated)
    if (activeFilter === 'duotone') {
      const canvas = canvasRef.current
      if (!canvas || !originalImageDataRef.current) return
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      const src = originalImageDataRef.current
      const buffer = new Uint8ClampedArray(src.data).buffer
      if (workerRef.current) workerRef.current.terminate()
      workerRef.current = new Worker('/filterWorker.js')
      workerRef.current.onmessage = (e) => {
        const out = new Uint8ClampedArray(e.data.out)
        ctx.putImageData(new ImageData(out, src.width, src.height), 0, 0)
        workerRef.current = null
      }
      workerRef.current.postMessage({ filter: 'duotone', strength: 1, colorA: updated.colorA, colorB: updated.colorB, buffer, width: src.width, height: src.height }, [buffer])
    }
  }, [activeFilter, duotoneColors])

  const handleStrengthChange = useCallback((strength) => {
    setFilterStrength(strength)
    if (!activeFilter) return
    const cfg = FILTERS.find(f => f.id === activeFilter)
    if (!cfg?.min) return
    clearTimeout(filterDebounceRef.current)
    filterDebounceRef.current = setTimeout(() => {
      if (activeFilter === 'curves') {
        applyFilter(activeFilter, 0, channelCurves)
      } else {
        applyFilter(activeFilter, strength)
      }
    }, 300)
  }, [applyFilter, activeFilter, channelCurves])

  const handleCurvesChange = useCallback((newCurves) => {
    setChannelCurves(newCurves)
    if (!activeFilter || activeFilter !== 'curves') return
    clearTimeout(filterDebounceRef.current)
    filterDebounceRef.current = setTimeout(() => {
      applyFilter('curves', 0, newCurves)
    }, 100)
  }, [activeFilter, applyFilter])

  const addToPalette = useCallback(() => {
    if (!color || color.r === null) return
    if (palette.length >= 24) return
    setPalette(prev => {
      const newPalette = [...prev, { ...color }]
      setSelectedSwatch(newPalette.length - 1)
      return newPalette
    })
  }, [color, palette])

  const removeFromPalette = useCallback((index) => {
    setPalette(prev => prev.filter((_, i) => i !== index))
    setSelectedSwatch(null)
  }, [])

  const parseCube = useCallback((text, name) => {
    const lines = text.split('\n')
    let size = 0
    const data = []
    for (const line of lines) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      if (t.startsWith('LUT_3D_SIZE')) { size = parseInt(t.split(/\s+/)[1]); continue }
      if (/^(TITLE|DOMAIN_MIN|DOMAIN_MAX|LUT_1D_SIZE)/.test(t)) continue
      const parts = t.split(/\s+/)
      if (parts.length >= 3 && !isNaN(parts[0])) {
        data.push(parseFloat(parts[0]), parseFloat(parts[1]), parseFloat(parts[2]))
      }
    }
    if (size > 0 && data.length === size * size * size * 3) {
      setLutData(new Float32Array(data))
      setLutSize(size)
      setLutName(name)
    } else {
      alert(`LUT parse error: expected ${size ? size+'³' : '?'} entries, got ${data.length / 3}`)
    }
  }, [])

  const handleExport = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = 'artwingman-export.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }, [])

  const centerImage = useCallback(() => {
    setViewport(v => ({ ...v, panX: 0, panY: 0 }))
  }, [])

  const fitHorizontal = useCallback(() => {
    if (!imgDims.w || !imgDims.h || !wrapSz.w || !wrapSz.h) return
    const aspect = imgDims.w / imgDims.h
    const baseW = Math.min(wrapSz.w, wrapSz.h * aspect)
    setViewport({ zoom: wrapSz.w / baseW, panX: 0, panY: 0 })
  }, [imgDims, wrapSz])

  const fitVertical = useCallback(() => {
    if (!imgDims.w || !imgDims.h || !wrapSz.w || !wrapSz.h) return
    const aspect = imgDims.w / imgDims.h
    const baseH = Math.min(wrapSz.h, wrapSz.w / aspect)
    setViewport({ zoom: wrapSz.h / baseH, panX: 0, panY: 0 })
  }, [imgDims, wrapSz])

  const ZOOM_TO_CLICK_LEVEL = 4
  const zoomToClick = useCallback(() => {
    if (!clickImagePos) return
    setViewport({
      zoom: ZOOM_TO_CLICK_LEVEL,
      panX: -clickImagePos.x * ZOOM_TO_CLICK_LEVEL,
      panY: -clickImagePos.y * ZOOM_TO_CLICK_LEVEL,
    })
  }, [clickImagePos])

  const hasColor = color.r !== null
  const [isMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    try { return Capacitor.isNativePlatform() } catch { return false }
  })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    try { return Capacitor.isNativePlatform() } catch { return false }
  })
  const [infoBarOpen, setInfoBarOpen] = useState(() => {
    if (typeof window === 'undefined') return true
    try { return !Capacitor.isNativePlatform() } catch { return true }
  })

  const SIDEBAR_ICONS = [
    { label: 'VG', title: 'Value Groups', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="2" fill="currentColor" opacity="0.9"/><rect x="1" y="7" width="14" height="2" fill="currentColor" opacity="0.6"/><rect x="1" y="11" width="14" height="2" fill="currentColor" opacity="0.3"/></svg> },
    { label: 'CG', title: 'Color Groups', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1" fill="#c87070"/><rect x="9" y="1" width="6" height="6" rx="1" fill="#70a0c8"/><rect x="1" y="9" width="6" height="6" rx="1" fill="#c8b470"/><rect x="9" y="9" width="6" height="6" rx="1" fill="#70c89a"/></svg> },
    { label: 'CP', title: 'Color Palette', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="4" cy="4" r="2.5" fill="#c87070"/><circle cx="12" cy="4" r="2.5" fill="#70a0c8"/><circle cx="4" cy="12" r="2.5" fill="#c8b470"/><circle cx="12" cy="12" r="2.5" fill="#70c89a"/><circle cx="8" cy="8" r="2.5" fill="currentColor" opacity="0.4"/></svg> },
    { label: 'Flt', title: 'Filter', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><line x1="2" y1="4" x2="14" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="6" cy="4" r="2" fill="#1a1a1a" stroke="currentColor" strokeWidth="1.5"/><line x1="2" y1="12" x2="14" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="10" cy="12" r="2" fill="#1a1a1a" stroke="currentColor" strokeWidth="1.5"/></svg> },
    { label: 'PM', title: 'Paint Match', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 13 L10 6 L12 8 L5 15 Z" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinejoin="round"/><path d="M10 6 L12 4 Q14 2 13 4 L12 8" stroke="currentColor" strokeWidth="1.2" fill="none"/></svg> },
  ]

  const paletteGridCols = paletteCount <= 8 ? 'repeat(4, 1fr)' : paletteCount <= 12 ? 'repeat(4, 1fr)' : 'repeat(6, 1fr)'

  return (
    <div className={styles.layout}>
      <aside className={`${styles.sidebar} ${sidebarCollapsed ? styles.sidebarCollapsed : ''}`}>

        {/* Collapsed icon strip */}
        {sidebarCollapsed ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 0 8px' }}>
              <button className={styles.sidebarToggle} onClick={() => setSidebarCollapsed(false)} title="Expand sidebar">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polyline points="4,2 8,6 4,10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
            <div className={styles.sidebarIconStrip}>
              {SIDEBAR_ICONS.map(({ label, title, icon }) => (
                <button key={label} className={styles.sidebarIconBtn} title={title} onClick={() => setSidebarCollapsed(false)}>
                  {icon}
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
        <>
        <div className={styles.logo}>
          <img src="/logo.svg" width={32} height={32} style={{borderRadius: 6}} alt="ArtWingman" />
          <div style={{ flex: 1 }}>
            <div className={styles.logoName}>ArtWingman</div>
            <div className={styles.logoSub}>v0.6 β</div>
          </div>
          <button className={styles.sidebarToggle} onClick={() => setSidebarCollapsed(true)} title="Collapse sidebar">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polyline points="8,2 4,6 8,10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>

        <div className={styles.accordion}>

          <div style={{ fontSize: 12, color: '#c8a96e', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '10px 12px 4px', fontWeight: 500 }}>Analyze</div>

          <AccordionDrawer title="Value Groups" isOpen={openDrawer.includes('value')} onToggle={() => toggleDrawer('value')}>
            <div className={styles.drawerControls}>
              <div className={styles.sectionLabel}>Number of steps</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, position: 'relative', height: 8 }}>
                  {devTicks(2, 10)}
                  <input type="range" min="2" max="10" step="1" value={valueSteps}
                    onChange={e => { valueTouchedRef.current = true; setValueSteps(Number(e.target.value)) }}
                    className={styles.slider} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', margin: 0 }} />
                </div>
                <span className={styles.sliderVal}>{valueSteps}</span>
              </div>
              <div className={styles.sectionLabel}>Soften</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, position: 'relative', height: 8 }}>
                  {devTicks(0, 20)}
                  <input type="range" min="0" max="20" step="1" value={valueSoften}
                    onChange={e => { valueTouchedRef.current = true; setValueSoften(Number(e.target.value)) }}
                    className={styles.slider} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', margin: 0 }} />
                </div>
                <span className={styles.sliderVal}>{valueSoften === 0 ? 'off' : valueSoften}</span>
              </div>
              <div className={styles.btnRow}>
                <button className={styles.btnSecondary} onClick={applyOriginalBW} disabled={!image}>
                  S/W
                </button>
                <button className={styles.btnSecondary} onClick={applyChromaMode} disabled={!image}>
                  Chroma
                </button>
                {(showGray || chromaMode) && (
                  <button className={styles.btnSecondary} onClick={resetCanvas}>
                    Reset
                  </button>
                )}
              </div>
            </div>
            <div className={styles.drawerResult}>
              <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#c8a96e' }}>
                {valueSteps} values
              </div>
              <div className={styles.valueSteps}>
                {Array.from({ length: valueSteps }).map((_, i) => (
                  <div key={i} className={styles.valueStep}
                    style={{ background: `hsl(0,0%,${Math.round(2 + (i / (valueSteps - 1)) * 98)}%)` }} />
                ))}
              </div>
            </div>
          </AccordionDrawer>

          <AccordionDrawer title="Color Groups" isOpen={openDrawer.includes('color')} onToggle={() => toggleDrawer('color')}>
            <div className={styles.drawerControls}>
              <div className={styles.sectionLabel}>Number of steps</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, position: 'relative', height: 8 }}>
                  {devTicks(2, 30)}
                  <input type="range" min="2" max="30" step="1" value={colorSteps}
                    onChange={e => { colorTouchedRef.current = true; setColorSteps(Number(e.target.value)) }}
                    className={styles.slider} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', margin: 0 }} />
                </div>
                <span className={styles.sliderVal}>{colorSteps}</span>
              </div>
              <div className={styles.sectionLabel}>Soften</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, position: 'relative', height: 8 }}>
                  {devTicks(0, 20)}
                  <input type="range" min="0" max="20" step="1" value={colorSoften}
                    onChange={e => setColorSoften(Number(e.target.value))}
                    className={styles.slider} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', margin: 0 }} />
                </div>
                <span className={styles.sliderVal}>{colorSoften === 0 ? 'off' : colorSoften}</span>
              </div>
              <div className={styles.btnRow}>
                <button className={styles.btnSecondary} onClick={() => {
                  setColorActive(false)
                  setColorSteps(30)
                  setColorSoften(0)
                  setColorClusters([])
                  colorTouchedRef.current = false
                }} disabled={!image}>
                  Reset
                </button>
              </div>
            </div>
            <div className={styles.drawerResult}>
              <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#c8a96e' }}>
                {colorSteps} colors
              </div>
              <div className={styles.valueSteps}>
                {colorClusters.length > 0
                  ? [...colorClusters]
                      .sort((a, b) => (0.2126*a.r + 0.7152*a.g + 0.0722*a.b) - (0.2126*b.r + 0.7152*b.g + 0.0722*b.b))
                      .map((c, i) => (
                        <div key={i} className={styles.valueStep}
                          style={{ background: `rgb(${c.r},${c.g},${c.b})`, cursor: 'pointer' }}
                          onClick={() => { setColor({ r: c.r, g: c.g, b: c.b, ...rgbToMunsellExact(c.r, c.g, c.b) }); setColorOverlayView('rgb'); setShowColorOverlay(true); }} />
                      ))
                  : Array.from({ length: colorSteps }).map((_, i) => (
                      <div key={i} className={styles.valueStep}
                        style={{ background: '#2a2a2a' }} />
                    ))
                }
              </div>
            </div>
          </AccordionDrawer>

          <AccordionDrawer title="Chroma Groups" isOpen={openDrawer.includes('chroma')} onToggle={() => toggleDrawer('chroma')}>
            <div className={styles.drawerControls}>
              <div className={styles.sectionLabel}>Number of steps</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, position: 'relative', height: 8 }}>
                  {devTicks(2, 12)}
                  <input type="range" min="2" max="12" step="1" value={chromaSteps}
                    onChange={e => { chromaTouchedRef.current = true; setChromaSteps(Number(e.target.value)) }}
                    className={styles.slider} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', margin: 0 }} />
                </div>
                <span className={styles.sliderVal}>{chromaSteps}</span>
              </div>
              <div className={styles.sectionLabel}>Soften</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, position: 'relative', height: 8 }}>
                  {devTicks(0, 20)}
                  <input type="range" min="0" max="20" step="1" value={chromaSoften}
                    onChange={e => { chromaTouchedRef.current = true; setChromaSoften(Number(e.target.value)) }}
                    className={styles.slider} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', margin: 0 }} />
                </div>
                <span className={styles.sliderVal}>{chromaSoften === 0 ? 'off' : chromaSoften}</span>
              </div>
              <div className={styles.btnRow}>
                <button className={styles.btnSecondary} onClick={() => {
                  setChromaMode(false)
                  setChromaSteps(12)
                  setChromaSoften(0)
                  chromaTouchedRef.current = false
                  const canvas = canvasRef.current
                  if (canvas && originalImageDataRef.current) {
                    const ctx = canvas.getContext('2d', { willReadFrequently: true })
                    ctx.putImageData(originalImageDataRef.current, 0, 0)
                  }
                }} disabled={!image}>
                  Reset
                </button>
              </div>
            </div>
            <div className={styles.drawerResult}>
              <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#c8a96e' }}>
                {chromaSteps} chroma
              </div>
              <div className={styles.valueSteps}>
                {Array.from({ length: chromaSteps }).map((_, i) => (
                  <div key={i} className={styles.valueStep}
                    style={{ background: `hsl(0,0%,${Math.round(2 + (i / (chromaSteps - 1)) * 98)}%)` }} />
                ))}
              </div>
            </div>
          </AccordionDrawer>

          <div style={{ fontSize: 12, color: '#c8a96e', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '10px 12px 4px', fontWeight: 500 }}>Develop</div>

          <AccordionDrawer title="Temperature" isOpen={openDrawer.includes('temperature')} onToggle={() => toggleDrawer('temperature')}>
                  <div className={styles.drawerControls}>
                    <DevSlider k="temperature" label="Temp" min={-100} max={100} fmt={v => v > 0 ? `+${Math.round(v)} ☀` : v < 0 ? `${Math.round(v)} ❄` : '0'} develop={develop} setDevelop={setDevelop} />
                    <DevSlider k="tint" label="Tint" min={-100} max={100} develop={develop} setDevelop={setDevelop} />
                    <div className={styles.btnRow} style={{ marginTop: 2 }}>
                      <button className={styles.btnSecondary}
                        onClick={() => setDevelop(d => ({ ...d, temperature:0, tint:0 }))}
                        disabled={develop.temperature === 0 && develop.tint === 0}>Reset</button>
                    </div>
                  </div>
                </AccordionDrawer>

                <AccordionDrawer title="Basic" isOpen={openDrawer.includes('basic')} onToggle={() => toggleDrawer('basic')}>
                  <div className={styles.drawerControls}>
                    <DevSlider k="exposure"   label="Exposure"   min={-5}   max={5}   step={0.1} fmt={v => `${v > 0 ? '+' : ''}${Number(v).toFixed(1)} EV`} develop={develop} setDevelop={setDevelop} />
                    <DevSlider k="contrast"   label="Contrast"   min={-100} max={100} develop={develop} setDevelop={setDevelop} />
                    <DevSlider k="highlights" label="Highlights" min={-100} max={100} develop={develop} setDevelop={setDevelop} />
                    <DevSlider k="shadows"    label="Shadows"    min={-100} max={100} develop={develop} setDevelop={setDevelop} />
                    <DevSlider k="whites"     label="Whites"     min={-100} max={100} develop={develop} setDevelop={setDevelop} />
                    <DevSlider k="blacks"     label="Blacks"     min={-100} max={100} develop={develop} setDevelop={setDevelop} />
                    <DevSlider k="sharpen"    label="Sharpen"    min={-100} max={100} develop={develop} setDevelop={setDevelop} />
                    <DevSlider k="vignette"   label="Vignette"   min={-100} max={100} develop={develop} setDevelop={setDevelop} />
                    <DevSlider k="noise"       label="Noise"      min={-100} max={100} develop={develop} setDevelop={setDevelop} />
                    <div className={styles.btnRow} style={{ marginTop: 2 }}>
                      <button className={styles.btnSecondary}
                        onClick={() => setDevelop(d => ({ ...d, exposure:0, contrast:0, highlights:0, shadows:0, whites:0, blacks:0, sharpen:0, vignette:0, noise:0 }))}
                        disabled={['exposure','contrast','highlights','shadows','whites','blacks','sharpen','vignette','noise'].every(k => develop[k] === 0)}>Reset</button>
                    </div>
                  </div>
                </AccordionDrawer>

                <AccordionDrawer title="Presence" isOpen={openDrawer.includes('presence')} onToggle={() => toggleDrawer('presence')}>
                  <div className={styles.drawerControls}>
                    <DevSlider k="texture"    label="Texture"    min={-100} max={100} develop={develop} setDevelop={setDevelop} />
                    <DevSlider k="clarity"    label="Clarity"    min={-100} max={100} develop={develop} setDevelop={setDevelop} />
                    <DevSlider k="dehaze"     label="Dehaze"     min={-100} max={100} develop={develop} setDevelop={setDevelop} />
                    <DevSlider k="vibrance"   label="Vibrance"   min={-100} max={100} develop={develop} setDevelop={setDevelop} />
                    <DevSlider k="saturation" label="Saturation" min={-100} max={100} develop={develop} setDevelop={setDevelop} />
                    <div className={styles.btnRow} style={{ marginTop: 2 }}>
                      <button className={styles.btnSecondary}
                        onClick={() => setDevelop(d => ({ ...d, texture:0, clarity:0, dehaze:0, vibrance:0, saturation:0 }))}
                        disabled={['texture','clarity','dehaze','vibrance','saturation'].every(k => develop[k] === 0)}>Reset</button>
                    </div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8, marginTop: 4 }}>
                      <div style={{ fontSize: 10, color: '#8a8680', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Load .cube LUT</div>
                      <input ref={lutFileRef} type="file" accept=".cube" style={{ display: 'none' }}
                        onChange={e => {
                          const f = e.target.files[0]
                          if (!f) return
                          const reader = new FileReader()
                          reader.onload = (ev) => parseCube(ev.target.result, f.name.replace(/\.cube$/i, ''))
                          reader.readAsText(f)
                          e.target.value = ''
                        }} />
                      {lutData ? (
                        <>
                          <div style={{ fontSize: 11, color: '#c8a96e', fontFamily: 'monospace', marginBottom: 6, wordBreak: 'break-all' }}>{lutName}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                            <span style={{ fontSize: 10, color: '#8a8680', fontFamily: 'monospace', width: 66, flexShrink: 0 }}>Intensity</span>
                            <input type="range" min={0} max={100} step={1} value={lutIntensity}
                              onChange={e => setLutIntensity(Number(e.target.value))}
                              className={styles.slider} style={{ flex: 1 }} />
                            <span style={{ fontSize: 10, fontFamily: 'monospace', minWidth: 44, textAlign: 'right', color: lutIntensity !== 100 ? '#c8a96e' : '#555250' }}>{lutIntensity}%</span>
                          </div>
                          <div className={styles.btnRow}>
                            <button className={styles.btnSecondary} onClick={() => lutFileRef.current?.click()}>Replace</button>
                            <button className={styles.btnSecondary} onClick={() => { setLutData(null); setLutSize(0); setLutName(''); setLutIntensity(100) }}>Remove</button>
                          </div>
                        </>
                      ) : (
                        <div className={styles.btnRow}>
                          <button className={styles.btnPrimary} onClick={() => lutFileRef.current?.click()}>Load .cube</button>
                        </div>
                      )}
                    </div>
                  </div>
                </AccordionDrawer>

          <AccordionDrawer title="Filter" isOpen={openDrawer.includes('filter')} onToggle={() => toggleDrawer('filter')}>
            <div className={styles.drawerControls}>
              <Filters
                activeFilter={activeFilter}
                onFilterChange={handleFilterChange}
                filterStrength={filterStrength}
                onStrengthChange={handleStrengthChange}
                onDuotoneColorsChange={handleDuotoneColorsChange}
                duotoneColors={duotoneColors}
                curves={channelCurves}
                onCurvesChange={handleCurvesChange}
              />
            </div>
          </AccordionDrawer>

          <AccordionDrawer title="Paint Match" isOpen={openDrawer.includes('paint')} onToggle={() => toggleDrawer('paint')}>
            <div className={styles.comingSoon}>Pro feature — coming soon</div>
          </AccordionDrawer>

        </div>
        </>
        )}

      </aside>

      <div className={styles.rightArea}>
        <div className={styles.toolbar} style={{ padding: '10px 12px 8px' }}>
              <button
                className={`${styles.toolBtn} ${gridMode === '3x3' ? styles.toolBtnActive : ''}`}
                onClick={() => setGridMode(m => m === '3x3' ? null : '3x3')}
              >3×3</button>
              <button
                className={`${styles.toolBtn} ${gridMode === '4x4' ? styles.toolBtnActive : ''}`}
                onClick={() => setGridMode(m => m === '4x4' ? null : '4x4')}
              >4×4</button>
              <button
                className={`${styles.toolBtn} ${gridMode === 'square' ? styles.toolBtnActive : ''}`}
                onClick={() => setGridMode(m => m === 'square' ? null : 'square')}
              >Grid</button>
              <select
                className={styles.gridSizeSelect}
                value={squareGridSize}
                onChange={e => { setSquareGridSize(Number(e.target.value)); setGridMode('square') }}
              >
                {Array.from({ length: 11 }, (_, i) => i + 2).map(n => (
                  <option key={n} value={n}>{n}×{n}</option>
                ))}
              </select>
              <button
                className={`${styles.toolBtn} ${showDiagonals ? styles.toolBtnActive : ''}`}
                onClick={() => setShowDiagonals(d => !d)}
                disabled={!gridMode}
              >Diag</button>
              <input
                type="color"
                value={gridColor}
                onChange={e => setGridColor(e.target.value)}
                className={styles.gridColorPicker}
                title="Grid color"
                disabled={!gridMode}
              />
              <input
                type="range" min="10" max="100"
                value={gridOpacity}
                onChange={e => setGridOpacity(Number(e.target.value))}
                className={styles.gridOpacitySlider}
                title={`Opacity ${gridOpacity}%`}
                disabled={!gridMode}
              />
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {bgColors.map(c => (
                  <div
                    key={c}
                    onClick={() => setCanvasBg(c)}
                    style={{
                      width: 24,
                      height: 16,
                      borderRadius: 4,
                      background: c,
                      cursor: 'pointer',
                      border: canvasBg === c ? '2px solid #c8a96e' : '1px solid rgba(255,255,255,0.15)',
                      transition: 'border 0.15s',
                    }}
                  />
                ))}
              </div>
                            <button
                className={styles.toolBtn}
                onClick={() => setViewport({ zoom: 1, panX: 0, panY: 0 })}
                title="Reset zoom"
                style={{ opacity: viewport.zoom === 1 && viewport.panX === 0 && viewport.panY === 0 ? 0.35 : 1 }}
              >
                1:1
              </button>
              {image && (
                <button className={styles.toolBtn} onClick={() => {
                  setImage(null)
                  setColor(DEFAULT_COLOR)
                  setShowGray(false)
                  setValueRating(null)
                  setActiveFilter(null)
                  setViewport({ zoom: 1, panX: 0, panY: 0 })
                  setColorActive(false)
                  setColorRating(null)
                  setColorClusters([])
                  setPaletteClusters([])
                  setLoupeMode(false)
                  setShowMunsellValues(false)
                  originalImageDataRef.current = null
                }}>
                  Load new image
                </button>
              )}
              {image && (
                <button className={styles.toolBtn} onClick={handleExport} title="Export as PNG"
                  style={{ marginLeft: 'auto', color: '#c8a96e', borderColor: 'rgba(200,169,110,0.3)' }}>
                  Export PNG
                </button>
              )}
        </div>
        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {!image ? (
          <div
            className={`${styles.dropzoneArea} ${dragging ? styles.dropzoneAreaActive : ''}`}
            style={{ background: canvasBg }}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className={`${styles.dropzone} ${dragging ? styles.dropzoneActive : ''}`}>
              <div className={styles.dropIcon}>+</div>
              <div className={styles.dropTitle}>Load reference image</div>
              <div className={styles.dropSub}>Click or drag & drop</div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*"
              style={{ display: 'none' }}
              onChange={e => loadFile(e.target.files[0])} />
          </div>
        ) : (
          <div className={styles.canvasSection}>
            <div
              ref={canvasWrapRef}
              className={styles.canvasWrap}
              style={{ background: canvasBg }}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => { setCursor(c => ({ ...c, visible: false })); setHoverMunsell(null); dragRef.current = null; if (loupeCanvasRef.current) { const lc = loupeCanvasRef.current.getContext('2d'); lc.clearRect(0, 0, 100, 100) } }}
              onMouseDown={handleCanvasMouseDown}
              onMouseUp={handleCanvasMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {showMinimap && (() => {
                const minimapW = 150
                const minimapH = 150
                const { zoom, panX, panY } = viewport
                const frameW = minimapW / zoom
                const frameH = minimapH / zoom
                const frameX = (-panX / zoom) * (minimapW / (imgDims.w || 1)) + minimapW / 2 - frameW / 2
                const frameY = (-panY / zoom) * (minimapH / (imgDims.h || 1)) + minimapH / 2 - frameH / 2
                return (
                  <div style={{
                    position: 'absolute', top: 10, left: 10, zIndex: 10,
                    width: minimapW, height: minimapH,
                    background: '#1a1a1a',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 6,
                    overflow: 'hidden',
                    pointerEvents: 'none',
                  }}>
                    <canvas ref={minimapCanvasRef} width={150} height={150} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                    {zoom > 1 && (
                      <div style={{
                        position: 'absolute',
                        left: frameX, top: frameY,
                        width: frameW, height: frameH,
                        border: '2px solid #ff3333',
                        boxSizing: 'border-box',
                        pointerEvents: 'none',
                      }} />
                    )}
                  </div>
                )
              })()}
              <div
                className={styles.canvasInner}
                style={{
                  ...(imgDims.w && imgDims.h ? { aspectRatio: `${imgDims.w} / ${imgDims.h}` } : {}),
                  transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`,
                  transformOrigin: 'center',
                  cursor: dragRef.current?.moved ? 'grabbing' : CROSSHAIR_CURSOR,
                  zIndex: 1,
                }}
              >
                <canvas ref={canvasRef} className={styles.canvas} />
                <GridOverlay gridMode={gridMode} squareGridSize={squareGridSize} showDiagonals={showDiagonals} gridColor={gridColor} gridOpacity={gridOpacity / 100} />
                {loupeMode && image && hoverMunsell && viewport.zoom <= 1.15 && clickPos && (() => {
                  const loupeLeft = clickPos.x > window.innerWidth / 2
                  const rawX = loupeLeft ? clickPos.x - 130 : clickPos.x + 20
                  const rawY = clickPos.y - 130
                  const loupeX = Math.max(0, Math.min(rawX, window.innerWidth - 100))
                  const loupeY = Math.max(0, rawY)
                  return (
                    <div style={{
                      position: 'fixed',
                      left: loupeX,
                      top: loupeY,
                      width: 100,
                      background: 'rgba(14,14,14,0.9)',
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.2)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                      overflow: 'hidden',
                      pointerEvents: 'none',
                      zIndex: 200,
                    }}>
                      <canvas ref={loupeCanvasRef} width={100} height={100} style={{ display: 'block', width: 100, height: 100, borderRadius: 0 }} />
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }}>
                        <div style={{ position: 'absolute', top: -0.5, left: -7, width: 14, height: 1, background: 'rgba(255,255,255,0.8)' }} />
                        <div style={{ position: 'absolute', left: -0.5, top: -7, width: 1, height: 14, background: 'rgba(255,255,255,0.8)' }} />
                      </div>
                      <div style={{ padding: '6px 8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                          <div style={{ flex: 1, height: 10, background: `rgb(${hoverMunsell.r},${hoverMunsell.g},${hoverMunsell.b})`, borderRadius: 2 }} />
                          <div style={{ flex: 1, height: 10, background: loupeData?.munsellChip ? `rgb(${loupeData.munsellChip.r},${loupeData.munsellChip.g},${loupeData.munsellChip.b})` : '#2a2a2a', borderRadius: 2 }} />
                        </div>
                        <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#c8a96e' }}>
                          {hoverMunsell.munsellStr}
                        </div>
                      </div>
                    </div>
                  )
                })()}
                {clickPos && (() => {
                  const displayW = canvasRef.current?.offsetWidth || 1
                  const scale = displayW / (imgDims.w || 1)
                  const half = Math.max(4, sampleRadius * scale)
                  const sq = half * 2
                  return (
                    <>
                      {/* Crosshair */}
                      <div style={{ position: 'absolute', left: clickPos.x - 12, top: clickPos.y, width: 24, height: 1, background: 'rgba(255,255,255,0.9)', pointerEvents: 'none' }} />
                      <div style={{ position: 'absolute', left: clickPos.x, top: clickPos.y - 12, width: 1, height: 24, background: 'rgba(255,255,255,0.9)', pointerEvents: 'none' }} />
                    </>
                  )
                })()}
                {!loupeMode && showMunsellValues && hoverMunsell && image && hoverPos && (() => {
                  const lum = (0.299 * hoverMunsell.r + 0.587 * hoverMunsell.g + 0.114 * hoverMunsell.b) / 255
                  const isLight = lum > 0.5
                  const chartRight = chartPanelRef.current ? chartPanelRef.current.getBoundingClientRect().right : hoverPos.x
                  return (
                    <div style={{
                      position: 'fixed',
                      left: hoverPos.x + 20,
                      top: hoverPos.y - 32,
                      transition: 'left 0.05s ease-out, top 0.05s ease-out',
                      padding: '3px 8px',
                      borderRadius: 4,
                      fontSize: 14,
                      fontFamily: 'monospace',
                      backdropFilter: 'blur(4px)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      pointerEvents: 'none',
                      zIndex: 100,
                      background: isLight ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.75)',
                      color: isLight ? '#ffffff' : '#000000',
                    }}>
                      {hoverMunsell.munsellStr}
                    </div>
                  )
                })()}
                {matchMode && matchPixels.length > 0 && (() => {
                  const dotR = Math.max(1, 2 / viewport.zoom)
                  return (
                    <svg viewBox={`0 0 ${imgDims.w} ${imgDims.h}`} width={imgDims.w} height={imgDims.h} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 2 }}>
                      {matchPixels.slice(0, 5000).map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r={dotR}
                          fill="rgba(255,60,60,0.45)" stroke="rgba(255,60,60,0.75)" strokeWidth="0.5" />
                      ))}
                    </svg>
                  )
                })()}
              </div>
            </div>
          </div>
        )}
        {showColorOverlay && color.r !== null && (
          <div
            onClick={() => setShowColorOverlay(false)}
            onMouseDown={e => e.stopPropagation()}
            onMouseUp={e => e.stopPropagation()}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                position: 'relative',
                width: '70%', height: '80%',
                borderRadius: 16,
                overflow: 'hidden',
                display: 'flex',
              }}
            >
              {/* X Button */}
              <button
                onClick={() => { setShowColorOverlay(false); setCompGray(3) }}
                style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.35)', color: 'white', fontSize: 16, cursor: 'pointer', zIndex: 1 }}
              >×</button>

              {/* Left panel: gray strip + Munsell info */}
              <div style={{ width: 220, flexShrink: 0, background: '#1a1a1a', display: 'flex', flexDirection: 'column' }}>
                {/* Gray comparison strip */}
                <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ position: 'relative', height: 48, flexShrink: 0 }}>
                    <div style={{ display: 'flex', height: '100%' }}>
                      {grayTones.map((g, i) => (
                        <div key={i} style={{
                          flex: 1, background: g,
                          outline: compGray === i ? '2px solid #c8a96e' : i === 3 ? '1px solid rgba(255,255,255,0.8)' : 'none',
                          outlineOffset: -2,
                        }} />
                      ))}
                    </div>
                    <input
                      type="range" min="0" max="6" step="1" value={compGray}
                      onChange={e => setCompGray(Number(e.target.value))}
                      className={styles.sliderThin}
                      style={{ position: 'absolute', top: '50%', left: 0, width: '100%', transform: 'translateY(-50%)' }}
                    />
                  </div>
                  <div style={{ flex: 1, background: grayTones[compGray], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 600, color: (8 - compGray) >= 5 ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)', userSelect: 'none' }}>
                      N{8 - compGray}/
                    </span>
                  </div>
                </div>
              </div>

              {/* Center panel — switches between RGB and Munsell based on colorOverlayView */}
              {colorOverlayView === 'munsell' ? (
                /* Munsell large in center */
                (() => {
                  const mc = munsellHvcToRgb(color.hue, color.value, color.chroma);
                  const bg = mc ? `rgb(${mc.r},${mc.g},${mc.b})` : `rgb(${color.r},${color.g},${color.b})`;
                  const lum = mc ? (0.299 * mc.r + 0.587 * mc.g + 0.114 * mc.b) / 255 : color.value / 10;
                  const tc = (v) => lum > 0.55 ? `rgba(0,0,0,${v})` : `rgba(255,255,255,${v})`;
                  return (
                    <div style={{ flex: 1, background: bg, position: 'relative', cursor: 'pointer' }} onClick={() => setColorOverlayView('rgb')}>
                      <div style={{ position: 'absolute', top: 20, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, pointerEvents: 'none' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 24, color: tc(0.4), textTransform: 'uppercase', letterSpacing: '0.1em' }}>Munsell Color</div>
                        <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 600, color: tc(0.6) }}>
                          {color.hue} {color.value.toFixed(1)}/{color.chroma.toFixed(1)}
                        </div>
                        <div style={{ fontFamily: 'monospace', fontSize: 14, color: tc(0.5) }}>
                          {color.hueName}
                        </div>
                        <div style={{ width: 80, borderTop: '1px solid', borderColor: lum > 0.55 ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' }} />
                        <div style={{ fontFamily: 'monospace', fontSize: 14, color: tc(0.5) }}>
                          {valueDescription(color.value)} · {chromaDescription(color.chroma)}
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                /* RGB large in center */
                (() => {
                  const { r, g, b } = color;
                  const K = Math.round((1 - Math.max(r, g, b) / 255) * 100);
                  const C = K === 100 ? 0 : Math.round((1 - r / 255 - K / 100) / (1 - K / 100) * 100);
                  const M = K === 100 ? 0 : Math.round((1 - g / 255 - K / 100) / (1 - K / 100) * 100);
                  const Y = K === 100 ? 0 : Math.round((1 - b / 255 - K / 100) / (1 - K / 100) * 100);
                  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                  const tc = (v) => lum > 0.55 ? `rgba(0,0,0,${v})` : `rgba(255,255,255,${v})`;
                  return (
                    <div style={{ flex: 1, background: `rgb(${r},${g},${b})`, position: 'relative', cursor: 'pointer' }} onClick={() => setColorOverlayView('munsell')}>
                      <div style={{ position: 'absolute', top: 20, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, pointerEvents: 'none' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 24, color: tc(0.4), textTransform: 'uppercase', letterSpacing: '0.1em' }}>RGB Color</div>
                        <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 600, color: tc(0.6) }}>
                          {`RGB ${r}, ${g}, ${b}`}
                        </div>
                        <div style={{ width: 80, borderTop: '1px solid', borderColor: lum > 0.55 ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' }} />
                        <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 600, color: tc(0.6) }}>
                          {`CMYK ${C}, ${M}, ${Y}, ${K}`}
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Right panel — opposite of center */}
              {colorOverlayView === 'munsell' ? (
                /* RGB small on right when Munsell is center */
                (() => {
                  const { r, g, b } = color;
                  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                  const textColor = lum > 0.55 ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)';
                  return (
                    <div style={{ width: 220, flexShrink: 0, background: `rgb(${r},${g},${b})`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, borderLeft: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }} onClick={() => setColorOverlayView('rgb')}>
                      <div style={{ fontFamily: 'monospace', fontSize: 14, color: textColor, textTransform: 'uppercase', letterSpacing: '0.1em' }}>RGB Color</div>
                      <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 600, color: textColor }}>
                        {`RGB ${r}, ${g}, ${b}`}
                      </div>
                    </div>
                  );
                })()
              ) : (
                /* Munsell small on right when RGB is center */
                (() => {
                  const mc = munsellHvcToRgb(color.hue, color.value, color.chroma);
                  const bg = mc ? `rgb(${mc.r},${mc.g},${mc.b})` : `rgb(${color.r},${color.g},${color.b})`;
                  const lum = mc ? (0.299 * mc.r + 0.587 * mc.g + 0.114 * mc.b) / 255 : color.value / 10;
                  const textColor = lum > 0.55 ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)';
                  return (
                    <div style={{ width: 220, flexShrink: 0, background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, borderLeft: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }} onClick={() => setColorOverlayView('munsell')}>
                      <div style={{ fontFamily: 'monospace', fontSize: 14, color: textColor, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Munsell Color</div>
                      <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 600, color: textColor, textAlign: 'center', lineHeight: 1.3 }}>
                        {color.hue} {color.value.toFixed(1)}/{color.chroma.toFixed(1)}
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: 13, color: textColor }}>
                        {color.hueName}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        )}
        <div className={styles.viewBtnStrip}>
          <button className={styles.viewBtn} onClick={fitVertical} title="Standardansicht" disabled={!image}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="5" y="5" width="6" height="6" stroke="currentColor" strokeWidth="1.5" fill="none" rx="1"/>
              <line x1="8" y1="1" x2="8" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <polyline points="6,3 8,1 10,3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="8" y1="12" x2="8" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <polyline points="6,13 8,15 10,13" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="1" y1="8" x2="4" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <polyline points="3,6 1,8 3,10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="12" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <polyline points="13,6 15,8 13,10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className={styles.viewBtn} onClick={zoomToClick} title="Zum Kreuz zoomen" disabled={!image || viewport.zoom >= 1.5}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
              <line x1="8" y1="1" x2="8" y2="4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="8" y1="11.5" x2="8" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="1" y1="8" x2="4.5" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="11.5" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <button className={styles.viewBtn} onClick={fitHorizontal} title="Breite anpassen" disabled={!image}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <line x1="1" y1="2" x2="1" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="15" y1="2" x2="15" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="1" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.5"/>
              <polyline points="5,5 1,8 5,11" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeLinecap="round"/>
              <polyline points="11,5 15,8 11,11" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeLinecap="round"/>
            </svg>
          </button>
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
          <button className={styles.viewBtn} onClick={() => { if (loupeMode) { setLoupeMode(false) } else { setLoupeMode(true); setShowMunsellValues(false) } }} title="Lupe an/aus" disabled={!image} style={{ color: loupeMode && image ? '#8a8680' : '#555250' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
              <line x1="10" y1="10" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <button className={styles.viewBtn} onClick={() => { if (showMunsellValues) { setShowMunsellValues(false) } else { setShowMunsellValues(true); setLoupeMode(false) } }} title="Munsell-Werte an/aus" disabled={!image} style={{ color: showMunsellValues && image ? '#8a8680' : '#555250' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
              <line x1="5" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1.2"/>
              <line x1="5" y1="9" x2="9" y2="9" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
          </button>
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
          <button className={styles.viewBtn} onClick={() => setShowMinimap(m => !m)} title="Minimap an/aus" disabled={!image} style={{ color: showMinimap && image ? '#8a8680' : '#555250' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="5" y="5" width="6" height="6" rx="0.5" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 1"/>
            </svg>
          </button>
          <button className={styles.viewBtn} onClick={() => { if (matchMode) { setMatchMode(false) } else { setMatchMode(true); setLoupeMode(false); setShowMunsellValues(false); triggerPixelMatch() } }} title="Gleiche Munsell-Farbe anzeigen" disabled={!image} style={{ color: matchMode && image ? '#c84e4e' : '#555250' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1" strokeDasharray="2 1"/>
            </svg>
          </button>
        </div>
        </div>

        {matchMode && matchColor && (
          <div style={{
            position: 'fixed',
            bottom: 16, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(14,14,14,0.85)',
            border: '1px solid rgba(200,80,80,0.3)',
            borderRadius: 8,
            padding: '6px 14px',
            color: '#c8a96e',
            fontFamily: 'monospace',
            fontSize: 13,
            zIndex: 150,
            pointerEvents: 'none',
          }}>
            {matchColor.hue} {matchColor.value.toFixed(1)}/{matchColor.chroma.toFixed(1)} — {matchPixels.length > 0 ? matchPixels.length.toLocaleString() : '…'} gleiche Pixel
          </div>
        )}

        {isMobile && !infoBarOpen && (
          <div style={{ height: 56, flexShrink: 0, background: '#1a1a1a', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', padding: '0 12px', gap: 10 }}>
            <div
              onClick={() => { if (!hasColor) return; setColorOverlayView('rgb'); setShowColorOverlay(true); }}
              style={{ width: 40, height: 40, borderRadius: 6, flexShrink: 0, background: hasColor ? `rgb(${color.r},${color.g},${color.b})` : '#2a2a2a', border: '1px solid rgba(255,255,255,0.1)', cursor: hasColor ? 'pointer' : 'default' }}
            />
            <div style={{ flex: 1, fontFamily: 'monospace', fontSize: 15, color: '#c8a96e' }}>
              {hasColor ? `${color.hue} ${color.value.toFixed(1)}/${color.chroma.toFixed(1)}` : '— / —'}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#706c68' }}>
              {hasColor ? `RGB ${color.r}, ${color.g}, ${color.b}` : ''}
            </div>
            <button onClick={() => setInfoBarOpen(true)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#8a8680', borderRadius: 5, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0 }}>▲</button>
          </div>
        )}
        {(!isMobile || infoBarOpen) && (
        <div className={styles.infoBar} style={{ zIndex: 10 }}>
          {isMobile && (
            <button onClick={() => setInfoBarOpen(false)} style={{ position: 'absolute', top: 8, right: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#8a8680', borderRadius: 5, width: 32, height: 28, cursor: 'pointer', fontSize: 10, zIndex: 1 }}>▼</button>
          )}
          {/* Panel 1: Munsell Color Swatch */}
          <div className={`${styles.infoPanel} ${styles.infoPanelSwatch}`}>
            <div className={styles.infoLabel}>Munsell Color</div>
            <div
              onClick={() => { if (!hasColor) return; setColorOverlayView('munsell'); setShowColorOverlay(true); }}
              title="Click to compare color"
              style={{
                flex: 1,
                borderRadius: 6,
                background: hasColor ? (() => { const m = munsellHvcToRgb(color.hue, color.value, color.chroma); return m ? `rgb(${m.r},${m.g},${m.b})` : '#2a2a2a' })() : '#2a2a2a',
                border: '1px solid rgba(255,255,255,0.08)',
                minHeight: 0,
                cursor: hasColor ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'flex-end',
              }}
            >
              {(() => {
                const mc = hasColor ? munsellHvcToRgb(color.hue, color.value, color.chroma) : null;
                const lum = mc ? (0.299 * mc.r + 0.587 * mc.g + 0.114 * mc.b) / 255 : 0;
                const light = lum > 0.55;
                return (
                  <div style={{
                    width: '100%',
                    padding: '6px 8px',
                    fontFamily: 'monospace',
                    fontSize: 15,
                    textAlign: 'center',
                    color: light ? '#141414' : '#e9e9e9',
                    lineHeight: 1.4,
                    textShadow: light ? '0 1px 2px rgba(255,255,255,0.3)' : '0 1px 3px rgba(0,0,0,0.6)',
                  }}>
                    {hasColor ? `${color.hue} ${color.value.toFixed(1)}/${color.chroma.toFixed(1)}` : '— / —'}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Panel 1b: Image Color (RGB + CMYK) */}
          <div className={`${styles.infoPanel} ${styles.infoPanelSwatch}`}>
            <div className={styles.infoLabel}>Image Color</div>
            <div
              onClick={() => { if (!hasColor) return; setColorOverlayView('rgb'); setShowColorOverlay(true); }}
              style={{
                flex: 1,
                borderRadius: 6,
                background: hasColor ? `rgb(${color.r},${color.g},${color.b})` : '#2a2a2a',
                border: '1px solid rgba(255,255,255,0.08)',
                minHeight: 0,
                position: 'relative',
                display: 'flex',
                alignItems: 'flex-end',
                cursor: hasColor ? 'pointer' : 'default',
              }}
            >
              {(() => {
                const lum = hasColor ? (0.299 * color.r + 0.587 * color.g + 0.114 * color.b) / 255 : 0;
                const light = lum > 0.55;
                const dividerColor = light ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.15)';
                const { r, g, b } = color;
                const K = hasColor ? Math.round((1 - Math.max(r, g, b) / 255) * 100) : 0;
                const C = K === 100 ? 0 : hasColor ? Math.round((1 - r / 255 - K / 100) / (1 - K / 100) * 100) : 0;
                const M = K === 100 ? 0 : hasColor ? Math.round((1 - g / 255 - K / 100) / (1 - K / 100) * 100) : 0;
                const Y = K === 100 ? 0 : hasColor ? Math.round((1 - b / 255 - K / 100) / (1 - K / 100) * 100) : 0;
                return (
                  <div style={{
                    width: '100%',
                    padding: '6px 8px',
                    fontFamily: 'monospace',
                    fontSize: 15,
                    textAlign: 'center',
                    color: light ? '#141414' : '#e9e9e9',
                    lineHeight: 1.4,
                    textShadow: light ? '0 1px 2px rgba(255,255,255,0.3)' : '0 1px 3px rgba(0,0,0,0.6)',
                  }}>
                    <div>{hasColor ? `RGB ${r}, ${g}, ${b}` : 'RGB — — —'}</div>
                    <div style={{ borderTop: `1px solid ${dividerColor}`, marginTop: 3, paddingTop: 3 }}>
                      {hasColor ? `CMYK ${C}, ${M}, ${Y}, ${K}` : 'CMYK — — — —'}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Panel 2: HVC + Munsell */}
          <div className={`${styles.infoPanel} ${styles.infoPanelHVC}`}>
            <div className={styles.infoLabel}>Munsell</div>
            <div className={styles.metrics}>
              <div className={styles.metric}>
                <div className={styles.metricLabel}>Hue</div>
                <div className={styles.metricValue}>{color.hue}</div>
                <div className={styles.metricDesc}>{color.hueName}</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.metricLabel}>Value</div>
                <div className={styles.metricValue}>{hasColor ? color.value.toFixed(1) : '—'}</div>
                <div className={styles.metricDesc}>{hasColor ? valueDescription(color.value) : '0-10 scale'}</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.metricLabel}>Chroma</div>
                <div className={styles.metricValue}>{hasColor ? color.chroma.toFixed(1) : '—'}</div>
                <div className={styles.metricDesc}>{hasColor ? chromaDescription(color.chroma) : 'saturation'}</div>
              </div>
            </div>
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#555250', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Munsell Input</div>
              <div style={{ display: 'flex', gap: 4 }}>
                <input
                  placeholder="5YR 4/6"
                  value={munsellInput}
                  onChange={e => {
                    const v = e.target.value.trim()
                    setMunsellInput(v)
                    if (!v) { setMunsellPreview(null); return }
                    handleMunsellInput(v)
                  }}
                  onKeyDown={e => {
                    if (e.key !== 'Enter') return
                    if (!munsellInput.trim()) return
                    handleMunsellInput(munsellInput.trim())
                    e.target.blur()
                  }}
                  style={{
                    flex: 1,
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    borderRadius: 4,
                    padding: '4px 8px',
                    fontFamily: 'monospace',
                    fontSize: 12,
                    color: '#c8a96e',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => { if (munsellInput.trim()) { handleMunsellInput(munsellInput.trim()); } }}
                  style={{
                    background: 'rgba(60,50,40,0.9)',
                    border: '1px solid rgba(200,169,110,0.4)',
                    borderRadius: 4,
                    padding: '4px 10px',
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: '#c8a96e',
                    cursor: 'pointer',
                    minWidth: 36,
                    position: 'relative',
                    zIndex: 20,
                  }}
                >Set</button>
              </div>
            </div>
          </div>

          {/* Panel 5: Munsell Chart */}
          <div className={`${styles.infoPanel} ${styles.infoPanelChart}`} ref={chartPanelRef}>
            <div className={styles.infoLabel}>Munsell Chart — {color.hueName !== '—' ? color.hueName : 'pick a color'}</div>
            <MunsellChart
              compact
              hueAngle={color.hueAngle}
              hueName={color.hueName}
              hue={color.hue}
              value={hasColor ? color.value : null}
              chroma={hasColor ? color.chroma : null}
              color={hasColor ? `rgb(${color.r},${color.g},${color.b})` : null}
              onCellOpen={({ r, g, b, hue, hueName, value, chroma }) => {
                setColor(prev => ({ ...prev, r, g, b, hue, hueName, value, chroma }))
                setColorOverlayView('munsell')
                setShowColorOverlay(true)
              }}
            />
          </div>

          {/* Panel 6: Palette */}
          <div className={`${styles.infoPanel} ${styles.infoPanelPalette}`}>
            <div className={styles.infoLabel}>Palette</div>
            <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
              <Palette
                palette={palette}
                selected={selectedSwatch}
                onSelect={(i) => setSelectedSwatch(prev => prev === i ? null : i)}
                onRemove={removeFromPalette}
                onClear={() => { setPalette([]); setSelectedSwatch(null) }}
                onAddToPalette={hasColor ? addToPalette : null}
                hasColor={hasColor}
              />
            </div>
          </div>

          {/* Panel 7: Color Palette (dominant image colors) */}
          <div className={`${styles.infoPanel} ${styles.infoPanelPalette}`} style={{ width: 260, borderRight: 'none' }}>
            <div className={styles.infoLabel}>Color Palette</div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
              {[6, 8, 12, 24].map(n => (
                <button key={n} onClick={() => setPaletteCount(n)} style={{
                  flex: 1, padding: '2px 0', fontSize: 10, fontFamily: 'monospace',
                  background: paletteCount === n ? 'rgba(200,169,110,0.2)' : 'transparent',
                  border: paletteCount === n ? '1px solid rgba(200,169,110,0.5)' : '1px solid rgba(255,255,255,0.1)',
                  color: paletteCount === n ? '#c8a96e' : '#555250',
                  borderRadius: 4, cursor: 'pointer',
                }}>{n}</button>
              ))}
            </div>
            <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
              <ColorPaletteGrid
                paletteClusters={paletteClusters}
                paletteCount={paletteCount}
                paletteGridCols={paletteGridCols}
                onColorClick={(r, g, b) => { setColor({ r, g, b, ...rgbToMunsellExact(r, g, b) }); setColorOverlayView('rgb'); setShowColorOverlay(true); }}
              />
            </div>
          </div>

        </div>
        )}
      </div>
      {/* Hidden WebGL canvas for GPU develop pipeline */}
      <canvas ref={glCanvasRef} style={{ position: 'fixed', top: -9999, left: -9999, pointerEvents: 'none' }} />
    </div>
  )
}
