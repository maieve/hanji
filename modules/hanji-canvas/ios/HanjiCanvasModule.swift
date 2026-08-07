import ExpoModulesCore
import PencilKit

public final class HanjiCanvasModule: Module {
  public func definition() -> ModuleDefinition {
    Name("HanjiCanvas")
    View(HanjiCanvasView.self) {
      Events("onDrawingChange")
      Prop("drawingData") { (view: HanjiCanvasView, value: String) in view.load(base64: value) }
      Prop("fingerDrawingEnabled") { (view: HanjiCanvasView, value: Bool) in view.canvas.drawingPolicy = value ? .anyInput : .pencilOnly }
      Prop("tool") { (view: HanjiCanvasView, value: [String: Any]) in view.setTool(value) }
    }
  }
}

final class HanjiCanvasView: ExpoView, PKCanvasViewDelegate {
  let canvas = PKCanvasView()
  let onDrawingChange = EventDispatcher()
  private var loadedValue = ""

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    canvas.delegate = self
    canvas.backgroundColor = .clear
    canvas.isOpaque = false
    canvas.drawingPolicy = .pencilOnly
    canvas.maximumSupportedContentVersion = .version2
    addSubview(canvas)
  }

  override func layoutSubviews() { super.layoutSubviews(); canvas.frame = bounds }

  func load(base64: String) {
    guard base64 != loadedValue else { return }
    loadedValue = base64
    guard let data = Data(base64Encoded: base64), let drawing = try? PKDrawing(data: data) else { return }
    canvas.drawing = drawing
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
    let color = UIColor(hex: value["color"] as? String ?? "#20201E").withAlphaComponent(opacity)
    canvas.tool = PKInkingTool(inkType, color: color, width: width)
  }

  func canvasViewDrawingDidChange(_ canvasView: PKCanvasView) {
    let value = canvasView.drawing.dataRepresentation().base64EncodedString()
    loadedValue = value
    onDrawingChange(["drawingData": value])
  }
}

private extension UIColor {
  convenience init(hex: String) {
    var raw = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
    if raw.count == 3 { raw = raw.map { "\($0)\($0)" }.joined() }
    var value: UInt64 = 0; Scanner(string: raw).scanHexInt64(&value)
    self.init(red: CGFloat((value >> 16) & 255) / 255, green: CGFloat((value >> 8) & 255) / 255, blue: CGFloat(value & 255) / 255, alpha: 1)
  }
}
