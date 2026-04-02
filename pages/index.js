import { useRef, useState, useCallback } from 'react'
import { rgbToMunsell, chromaDescription, valueDescription, samplePixels } from '../lib/munsell'
import styles from '../styles/Home.module.css'
import HueWheel from '../components/HueWheel'
import Palette from '../components/Palette'
import GridOverlay from '../components/GridOverlay'
import Filters from '../components/Filters'
import MunsellChart from '../components/MunsellChart'

const DEFAULT_COLOR = {
  r: null, g: null, b: null,
  hue: '—', hueName: '—', hueAngle: 0,
  value: null, chroma: null
}

function AccordionDrawer({ title, isOpen, onToggle, children }) {
  return (
    <div className={styles.drawer}>
      <button className={`${styles.drawerHeader} ${isOpen ? styles.drawerHeaderActive : ''}`} onClick={onToggle}>
        <span className={styles.drawerTitle}>{title}</span>
        <span className={styles.drawerArrow}>{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && <div className={styles.drawerBody}>{children}</div>}
    </div>
  )
}

export default function Home() {
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)
  const originalImageDataRef = useRef(null)
  const workerRef = useRef(null)
  const filterDebounceRef = useRef(null)
  const [image, setImage] = useState(null)
  const [imgDims, setImgDims] = useState({ w: 0, h: 0 })
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [cursor, setCursor] = useState({ x: 0, y: 0, visible: false })
  const [sampleRadius, setSampleRadius] = useState(3)
  const [dragging, setDragging] = useState(false)
  const [openDrawer, setOpenDrawer] = useState(['color'])
  const [valueSteps, setValueSteps] = useState(5)
  const [showGray, setShowGray] = useState(false)
  const [valueRating, setValueRating] = useState(null)
  const [palette, setPalette] = useState([])
  const [selectedSwatch, setSelectedSwatch] = useState(null)
  const [gridMode, setGridMode] = useState(null)
  const [squareGridSize, setSquareGridSize] = useState(4)
  const [showDiagonals, setShowDiagonals] = useState(false)
  const [gridColor, setGridColor] = useState('#ffffff')
  const [gridOpacity, setGridOpacity] = useState(90)
  const [activeFilter, setActiveFilter] = useState(null)
  const [filterStrength, setFilterStrength] = useState(5)

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
        setTimeout(() => {
          const canvas = canvasRef.current
          if (canvas) {
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d', { willReadFrequently: true })
            ctx.drawImage(img, 0, 0)
            originalImageDataRef.current = ctx.getImageData(0, 0, img.width, img.height)
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

  const handleCanvasClick = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = imgDims.w / rect.width
    const scaleY = imgDims.h / rect.height
    const px = Math.floor((e.clientX - rect.left) * scaleX)
    const py = Math.floor((e.clientY - rect.top) * scaleY)
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const imageData = ctx.getImageData(0, 0, imgDims.w, imgDims.h)
    const { r, g, b } = samplePixels(imageData, px, py, sampleRadius, imgDims.w, imgDims.h)
    setColor({ r, g, b, ...rgbToMunsell(r, g, b) })
  }, [imgDims, sampleRadius])

  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top, visible: true })
  }, [])

  const applyValueGroups = useCallback(() => {
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
      const lum = 0.2126 * data[i] + 0.7152 * data[i+1] + 0.0722 * data[i+2]
      const group = Math.min(valueSteps - 1, Math.floor((lum / 255) * valueSteps))
      const grayVal = Math.round((group / (valueSteps - 1)) * 255)
      data[i] = data[i+1] = data[i+2] = grayVal
    }
    ctx.putImageData(imageData, 0, 0)
    setShowGray(true)
    if (valueSteps <= 4) setValueRating('green')
    else if (valueSteps <= 7) setValueRating('yellow')
    else setValueRating('red')
  }, [valueSteps])

  const resetCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !originalImageDataRef.current) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.putImageData(originalImageDataRef.current, 0, 0)
    setShowGray(false)
    setValueRating(null)
  }, [])

  const applyFilter = useCallback((filter, strength) => {
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
    workerRef.current.postMessage({ filter, strength, buffer, width: src.width, height: src.height }, [buffer])
  }, [])

  const handleFilterChange = useCallback((filter) => {
    setActiveFilter(filter)
    applyFilter(filter, filterStrength)
  }, [applyFilter, filterStrength])

  const handleStrengthChange = useCallback((strength) => {
    setFilterStrength(strength)
    if (activeFilter !== 'soften') return
    clearTimeout(filterDebounceRef.current)
    filterDebounceRef.current = setTimeout(() => applyFilter('soften', strength), 300)
  }, [applyFilter, activeFilter])

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

  const hasColor = color.r !== null

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>AW</span>
          <div>
            <div className={styles.logoName}>ArtWingman</div>
            <div className={styles.logoSub}>v0.6</div>
          </div>
        </div>

        <div className={styles.accordion}>

          <AccordionDrawer title="Color Finder" isOpen={openDrawer.includes('color')} onToggle={() => toggleDrawer('color')}>
            <div className={styles.drawerControls}>
              <div className={styles.sectionLabel}>Sample Radius</div>
              <div className={styles.sliderRow}>
                <input type="range" min="1" max="20" value={sampleRadius}
                  onChange={e => setSampleRadius(Number(e.target.value))}
                  className={styles.slider} />
                <span className={styles.sliderVal}>{sampleRadius}px</span>
              </div>
              {hasColor && palette.length < 24 && (
                <div className={styles.btnRow}>
                  <button className={styles.btnPrimary} onClick={addToPalette}>
                    + Add to Palette
                  </button>
                </div>
              )}
            </div>
          </AccordionDrawer>

          <AccordionDrawer title="Value Groups" isOpen={openDrawer.includes('value')} onToggle={() => toggleDrawer('value')}>
            <div className={styles.drawerControls}>
              <div className={styles.sectionLabel}>Number of steps</div>
              <div className={styles.sliderRow}>
                <input type="range" min="3" max="10" step="1" value={valueSteps}
                  onChange={e => setValueSteps(Number(e.target.value))}
                  className={styles.slider} />
                <span className={styles.sliderVal}>{valueSteps}</span>
              </div>
              <div className={styles.btnRow}>
                <button className={styles.btnPrimary} onClick={applyValueGroups} disabled={!image}>
                  Analyze
                </button>
                {showGray && (
                  <button className={styles.btnSecondary} onClick={resetCanvas}>
                    Reset
                  </button>
                )}
              </div>
            </div>
            {valueRating && (
              <div className={styles.drawerResult}>
                <div className={`${styles.ampel} ${styles['ampel' + valueRating]}`}>
                  {valueRating === 'green' && `${valueSteps} values — ideal for painting`}
                  {valueRating === 'yellow' && `${valueSteps} values — acceptable`}
                  {valueRating === 'red' && `${valueSteps} values — too complex, simplify`}
                </div>
                <div className={styles.valueSteps}>
                  {Array.from({ length: valueSteps }).map((_, i) => (
                    <div key={i} className={styles.valueStep}
                      style={{ background: `hsl(0,0%,${Math.round((i / (valueSteps - 1)) * 100)}%)` }} />
                  ))}
                </div>
              </div>
            )}
          </AccordionDrawer>

          <AccordionDrawer title="Filters" isOpen={openDrawer.includes('filters')} onToggle={() => toggleDrawer('filters')}>
            <div className={styles.drawerControls}>
              <Filters
                activeFilter={activeFilter}
                onFilterChange={handleFilterChange}
                filterStrength={filterStrength}
                onStrengthChange={handleStrengthChange}
              />
            </div>
          </AccordionDrawer>

          <AccordionDrawer title="Paint Match" isOpen={openDrawer.includes('paint')} onToggle={() => toggleDrawer('paint')}>
            <div className={styles.comingSoon}>Pro feature — coming soon</div>
          </AccordionDrawer>

        </div>

        {image && (
          <button className={styles.changeBtnSidebar} onClick={() => {
            setImage(null)
            setColor(DEFAULT_COLOR)
            setShowGray(false)
            setValueRating(null)
            setActiveFilter(null)
            originalImageDataRef.current = null
          }}>
            Load new image
          </button>
        )}
      </aside>

      <div className={styles.rightArea}>
        {!image ? (
          <div
            className={`${styles.dropzoneArea} ${dragging ? styles.dropzoneAreaActive : ''}`}
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
            <div className={styles.toolbar}>
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
            </div>
            <div className={styles.canvasWrap}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setCursor(c => ({ ...c, visible: false }))}>
              <div
                className={styles.canvasInner}
                style={imgDims.w && imgDims.h ? { aspectRatio: `${imgDims.w} / ${imgDims.h}` } : undefined}
              >
                <canvas ref={canvasRef} className={styles.canvas} onClick={handleCanvasClick} />
                <GridOverlay gridMode={gridMode} squareGridSize={squareGridSize} showDiagonals={showDiagonals} gridColor={gridColor} gridOpacity={gridOpacity / 100} />
                {cursor.visible && (
                  <div className={styles.crosshair} style={{ left: cursor.x, top: cursor.y }} />
                )}
              </div>
            </div>
          </div>
        )}

        <div className={styles.infoBar}>
          {/* Panel 1: Swatch + RGB */}
          <div className={`${styles.infoPanel} ${styles.infoPanelSwatch}`}>
            <div className={styles.infoLabel}>Color</div>
            <div style={{
              flex: 1,
              borderRadius: 6,
              background: hasColor ? `rgb(${color.r},${color.g},${color.b})` : '#2a2a2a',
              border: '1px solid rgba(255,255,255,0.08)',
              minHeight: 0,
            }} />
            <div className={styles.rgbLabel}>
              {hasColor ? `RGB ${color.r}, ${color.g}, ${color.b}` : 'RGB — — —'}
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
            <div className={styles.munsellNotation}>
              {hasColor ? `${color.hue} ${color.value.toFixed(1)}/${color.chroma.toFixed(1)}` : '— / —'}
            </div>
          </div>

          {/* Panel 3: Hue Wheel */}
          <div className={`${styles.infoPanel} ${styles.infoPanelHueWheel}`}>
            <HueWheel
              hueAngle={color.hueAngle}
              hueName={color.hueName}
              color={hasColor ? `rgb(${color.r},${color.g},${color.b})` : null}
              active={hasColor}
            />
          </div>

          {/* Panel 4: Munsell Chart */}
          <div className={`${styles.infoPanel} ${styles.infoPanelChart}`}>
            <div className={styles.infoLabel}>Munsell Chart — {color.hueName !== '—' ? color.hueName : 'pick a color'}</div>
            <MunsellChart
              compact
              hueAngle={color.hueAngle}
              hueName={color.hueName}
              hue={color.hue}
              value={hasColor ? color.value : null}
              chroma={hasColor ? color.chroma : null}
              color={hasColor ? `rgb(${color.r},${color.g},${color.b})` : null}
            />
          </div>

          {/* Panel 5: Palette */}
          <div className={`${styles.infoPanel} ${styles.infoPanelPalette}`}>
            <div className={styles.infoLabel}>Palette</div>
            <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
              <Palette
                palette={palette}
                selected={selectedSwatch}
                onSelect={(i) => setSelectedSwatch(prev => prev === i ? null : i)}
                onRemove={removeFromPalette}
                onClear={() => { setPalette([]); setSelectedSwatch(null) }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
