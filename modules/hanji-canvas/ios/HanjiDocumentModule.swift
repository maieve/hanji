import ExpoModulesCore
import PDFKit
import PencilKit

public final class HanjiDocumentModule: Module {
  public func definition() -> ModuleDefinition {
    Name("HanjiDocumentCanvas")
    View(HanjiDocumentView.self) {
      Events("onDrawingChange", "onPageCount", "onStrokeAdded", "onStrokeTapped", "onHistoryChange")
      Prop("pdfUri") { (view: HanjiDocumentView, uri: String?) in view.loadPDF(uri) }
      Prop("pageIndex") { (view: HanjiDocumentView, index: Int) in view.showPage(index) }
      Prop("drawingData") { (view: HanjiDocumentView, value: String) in view.loadDrawing(value) }
      Prop("fingerDrawingEnabled") { (view: HanjiDocumentView, value: Bool) in
        view.canvas.drawingPolicy = value ? .anyInput : .pencilOnly
      }
      Prop("tool") { (view: HanjiDocumentView, value: [String: Any]) in view.setTool(value) }
      Prop("undoSignal") { (view: HanjiDocumentView, value: Int) in view.applyUndoSignal(value) }
      Prop("redoSignal") { (view: HanjiDocumentView, value: Int) in view.applyRedoSignal(value) }
    }
  }
}

final class HanjiDocumentView: ExpoView, PKCanvasViewDelegate {
  let pdfView = PDFView()
  let canvas = PKCanvasView()
  let onDrawingChange = EventDispatcher()
  let onPageCount = EventDispatcher()
  let onStrokeAdded = EventDispatcher()
  let onStrokeTapped = EventDispatcher()
  let onHistoryChange = EventDispatcher()
  private var document: PDFDocument?
  private var currentPage = 0
  private var loadedDrawing = ""
  private var knownStrokeCount = 0
  private var lastUndoSignal = 0
  private var lastRedoSignal = 0

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    backgroundColor = .systemGray6
    pdfView.autoScales = true
    pdfView.displayMode = .singlePage
    pdfView.displayDirection = .horizontal
    pdfView.pageShadowsEnabled = false
    canvas.backgroundColor = .clear
    canvas.isOpaque = false
    canvas.drawingPolicy = .pencilOnly
    canvas.maximumSupportedContentVersion = .version2
    canvas.delegate = self
    let tap = UITapGestureRecognizer(target: self, action: #selector(handleCanvasTap(_:)))
    tap.cancelsTouchesInView = false
    tap.allowedTouchTypes = [NSNumber(value: UITouch.TouchType.direct.rawValue)]
    canvas.addGestureRecognizer(tap)
    addSubview(pdfView)
    addSubview(canvas)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    pdfView.frame = bounds
    canvas.frame = bounds
  }

  func loadPDF(_ uri: String?) {
    guard let uri, !uri.isEmpty else {
      document = nil
      pdfView.document = nil
      return
    }
    let url: URL?
    if uri.hasPrefix("file://") { url = URL(string: uri) } else { url = URL(fileURLWithPath: uri) }
    guard let url, pdfView.document?.documentURL != url, let pdf = PDFDocument(url: url) else { return }
    document = pdf
    pdfView.document = pdf
    pdfView.autoScales = true
    onPageCount(["count": pdf.pageCount])
    showPage(currentPage)
  }

  func showPage(_ index: Int) {
    currentPage = max(0, index)
    guard let page = document?.page(at: currentPage) else { return }
    pdfView.go(to: page)
    pdfView.autoScales = true
  }

  func loadDrawing(_ base64: String) {
    guard base64 != loadedDrawing else { return }
    loadedDrawing = base64
    if base64.isEmpty {
      canvas.drawing = PKDrawing()
    } else if let data = Data(base64Encoded: base64), let drawing = try? PKDrawing(data: data) {
      canvas.drawing = drawing
    }
    knownStrokeCount = canvas.drawing.strokes.count
  }

  func setTool(_ value: [String: Any]) {
    let kind = value["kind"] as? String ?? "pen"
    let width = (value["width"] as? NSNumber)?.doubleValue ?? 2
    let opacity = (value["opacity"] as? NSNumber)?.doubleValue ?? 1
    canvas.isRulerActive = value["rulerActive"] as? Bool ?? false
    if kind == "lasso" { canvas.tool = PKLassoTool(); return }
    if kind == "eraser" {
      let mode = value["eraserMode"] as? String ?? "vector"
      let eraserType: PKEraserTool.EraserType = mode == "bitmap" ? .bitmap : mode == "fixedWidthBitmap" ? .fixedWidthBitmap : .vector
      canvas.tool = PKEraserTool(eraserType)
      return
    }
    let inkType: PKInk.InkType
    switch kind {
    case "fountainPen": inkType = .fountainPen
    case "monoline": inkType = .monoline
    case "pencil": inkType = .pencil
    case "crayon": inkType = .crayon
    case "watercolor": inkType = .watercolor
    case "marker": inkType = .marker
    default: inkType = .pen
    }
    let color = UIColor(hanjiHex: value["color"] as? String ?? "#20201E").withAlphaComponent(opacity)
    canvas.tool = PKInkingTool(inkType, color: color, width: width)
  }

  func applyUndoSignal(_ value: Int) {
    if value != lastUndoSignal { lastUndoSignal = value; canvas.undoManager?.undo() }
  }

  func applyRedoSignal(_ value: Int) {
    if value != lastRedoSignal { lastRedoSignal = value; canvas.undoManager?.redo() }
  }

  @objc private func handleCanvasTap(_ recognizer: UITapGestureRecognizer) {
    let point = recognizer.location(in: canvas)
    let hit = canvas.drawing.strokes.reversed().first { $0.renderBounds.insetBy(dx: -14, dy: -14).contains(point) }
    if let hit { onStrokeTapped(["createdAt": hit.path.creationDate.timeIntervalSince1970]) }
  }

  func canvasViewDrawingDidChange(_ canvasView: PKCanvasView) {
    let strokes = canvasView.drawing.strokes
    if strokes.count > knownStrokeCount, let stroke = strokes.last {
      onStrokeAdded(["createdAt": stroke.path.creationDate.timeIntervalSince1970])
    }
    knownStrokeCount = strokes.count
    let value = canvasView.drawing.dataRepresentation().base64EncodedString()
    loadedDrawing = value
    onDrawingChange(["drawingData": value])
    onHistoryChange([
      "canUndo": canvasView.undoManager?.canUndo ?? false,
      "canRedo": canvasView.undoManager?.canRedo ?? false
    ])
  }
}

extension UIColor {
  convenience init(hanjiHex: String) {
    var raw = hanjiHex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
    if raw.count == 3 { raw = raw.map { "\($0)\($0)" }.joined() }
    var value: UInt64 = 0
    Scanner(string: raw).scanHexInt64(&value)
    self.init(
      red: CGFloat((value >> 16) & 255) / 255,
      green: CGFloat((value >> 8) & 255) / 255,
      blue: CGFloat(value & 255) / 255,
      alpha: 1
    )
  }
}
