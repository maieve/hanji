import ExpoModulesCore
import PDFKit
import PencilKit
import UIKit
import Vision

public final class HanjiVisionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("HanjiVision")
    AsyncFunction("recognizeDrawing") { (base64: String) throws -> [String: Any] in
      guard let data = Data(base64Encoded: base64), let drawing = try? PKDrawing(data: data), !drawing.strokes.isEmpty else { return ["text": "", "words": []] }
      let bounds = drawing.bounds.insetBy(dx: -24, dy: -24)
      let inkImage = drawing.image(from: bounds, scale: 3), format = UIGraphicsImageRendererFormat()
      format.scale = 3; format.opaque = true
      let image = UIGraphicsImageRenderer(size: inkImage.size, format: format).image { context in
        UIColor.white.setFill(); context.fill(CGRect(origin: .zero, size: inkImage.size)); inkImage.draw(at: .zero)
      }
      guard let cgImage = image.cgImage else { return ["text": "", "words": []] }
      let request = VNRecognizeTextRequest()
      request.recognitionLevel = .accurate
      request.usesLanguageCorrection = true
      request.recognitionLanguages = ["ko-KR", "en-US"]
      try VNImageRequestHandler(cgImage: cgImage, options: [:]).perform([request])
      let observations = request.results ?? []
      let words: [[String: Any]] = observations.compactMap { item in
        guard let candidate = item.topCandidates(1).first else { return nil }
        let box = item.boundingBox
        return ["text": candidate.string, "confidence": candidate.confidence, "x": bounds.minX + box.minX * bounds.width, "y": bounds.minY + (1 - box.maxY) * bounds.height, "width": box.width * bounds.width, "height": box.height * bounds.height, "coordinateSpace": "canvas"]
      }
      return ["text": words.compactMap { $0["text"] as? String }.joined(separator: " "), "words": words]
    }
    AsyncFunction("exportPDF") { (pages: [[String: String]], outputUri: String) throws -> String in
      let outputURL = outputUri.hasPrefix("file://") ? URL(string: outputUri)! : URL(fileURLWithPath: outputUri)
      let defaultBounds = CGRect(x: 0, y: 0, width: 900, height: 636)
      let renderer = UIGraphicsPDFRenderer(bounds: defaultBounds)
      try renderer.writePDF(to: outputURL) { context in
        for (index, item) in pages.enumerated() {
          let pdfURI = item["pdfUri"] ?? ""
          let sourceURL = pdfURI.isEmpty ? nil : (pdfURI.hasPrefix("file://") ? URL(string: pdfURI) : URL(fileURLWithPath: pdfURI))
          let sourceDocument = sourceURL.flatMap { PDFDocument(url: $0) }
          let sourcePage = sourceDocument?.page(at: Int(item["pdfPageIndex"] ?? "") ?? index)
          let bounds = sourcePage?.bounds(for: .mediaBox) ?? defaultBounds
          let rotation = Int(item["rotation"] ?? "") ?? 0, outputBounds = rotatedBounds(bounds, rotation: rotation)
          context.beginPage(withBounds: outputBounds, pageInfo: [:])
          UIColor.white.setFill(); context.cgContext.fill(outputBounds)
          context.cgContext.saveGState(); applyPageRotation(context.cgContext, source: bounds, rotation: rotation)
          if let sourcePage {
            context.cgContext.saveGState()
            context.cgContext.translateBy(x: 0, y: bounds.height)
            context.cgContext.scaleBy(x: 1, y: -1)
            sourcePage.draw(with: .mediaBox, to: context.cgContext)
            context.cgContext.restoreGState()
          } else if !drawTemplateImage(item["customTemplateUri"] ?? "", in: bounds) { drawHanjiTemplate(item["template"] ?? "plain", in: bounds, context: context.cgContext) }
          if let encoded = item["drawingData"], let data = Data(base64Encoded: encoded), let drawing = try? PKDrawing(data: data), !drawing.strokes.isEmpty {
            drawing.image(from: bounds, scale: 3).draw(in: bounds)
          }
          drawTextElements(item["elements"] ?? "[]", in: bounds)
          context.cgContext.restoreGState()
        }
      }
      return outputURL.absoluteString
    }
    AsyncFunction("exportPNG") { (item: [String: String], outputUri: String) throws -> String in
      let outputURL = outputUri.hasPrefix("file://") ? URL(string: outputUri)! : URL(fileURLWithPath: outputUri)
      let defaultBounds = CGRect(x: 0, y: 0, width: 900, height: 636)
      let pdfURI = item["pdfUri"] ?? ""
      let sourceURL = pdfURI.isEmpty ? nil : (pdfURI.hasPrefix("file://") ? URL(string: pdfURI) : URL(fileURLWithPath: pdfURI))
      let sourcePage = sourceURL.flatMap { PDFDocument(url: $0) }?.page(at: Int(item["pdfPageIndex"] ?? "") ?? 0)
      let bounds = sourcePage?.bounds(for: .mediaBox) ?? defaultBounds
      let rotation = Int(item["rotation"] ?? "") ?? 0, outputBounds = rotatedBounds(bounds, rotation: rotation)
      let format = UIGraphicsImageRendererFormat(); format.scale = 3; format.opaque = true
      let image = UIGraphicsImageRenderer(size: outputBounds.size, format: format).image { context in
        UIColor.white.setFill(); context.cgContext.fill(outputBounds)
        context.cgContext.saveGState(); applyPageRotation(context.cgContext, source: bounds, rotation: rotation)
        if let sourcePage {
          context.cgContext.saveGState()
          context.cgContext.translateBy(x: 0, y: bounds.height)
          context.cgContext.scaleBy(x: 1, y: -1)
          sourcePage.draw(with: .mediaBox, to: context.cgContext)
          context.cgContext.restoreGState()
        } else if !drawTemplateImage(item["customTemplateUri"] ?? "", in: bounds) { drawHanjiTemplate(item["template"] ?? "plain", in: bounds, context: context.cgContext) }
        if let encoded = item["drawingData"], let data = Data(base64Encoded: encoded), let drawing = try? PKDrawing(data: data), !drawing.strokes.isEmpty {
          drawing.image(from: bounds, scale: 3).draw(in: bounds)
        }
        drawTextElements(item["elements"] ?? "[]", in: bounds)
        context.cgContext.restoreGState()
      }
      guard let data = image.pngData() else { throw NSError(domain: "HanjiExport", code: 1, userInfo: [NSLocalizedDescriptionKey: "PNG encoding failed"]) }
      try data.write(to: outputURL, options: .atomic)
      return outputURL.absoluteString
    }
  }
}

private func rotatedBounds(_ source: CGRect, rotation: Int) -> CGRect {
  let normalized = ((rotation % 360) + 360) % 360
  return normalized == 90 || normalized == 270 ? CGRect(x: 0, y: 0, width: source.height, height: source.width) : CGRect(origin: .zero, size: source.size)
}

private func applyPageRotation(_ context: CGContext, source: CGRect, rotation: Int) {
  switch ((rotation % 360) + 360) % 360 {
  case 90: context.translateBy(x: source.height, y: 0); context.rotate(by: .pi / 2)
  case 180: context.translateBy(x: source.width, y: source.height); context.rotate(by: .pi)
  case 270: context.translateBy(x: 0, y: source.width); context.rotate(by: -.pi / 2)
  default: break
  }
}

@discardableResult private func drawTemplateImage(_ uri: String, in bounds: CGRect) -> Bool {
  guard !uri.isEmpty else { return false }
  let url = uri.hasPrefix("file://") ? URL(string: uri) : URL(fileURLWithPath: uri)
  guard let path = url?.path, let image = UIImage(contentsOfFile: path) else { return false }
  image.draw(in: bounds); return true
}

private func drawTextElements(_ json: String, in bounds: CGRect) {
  guard let data = json.data(using: .utf8), let items = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else { return }
  for item in items {
    let x = (item["x"] as? NSNumber)?.doubleValue ?? 0, y = (item["y"] as? NSNumber)?.doubleValue ?? 0
    let width = (item["width"] as? NSNumber)?.doubleValue ?? 0.4, height = (item["height"] as? NSNumber)?.doubleValue ?? 0.12
    let rect = CGRect(x: bounds.width * x, y: bounds.height * y, width: bounds.width * width, height: bounds.height * height)
    if item["kind"] as? String == "image", let uri = item["uri"] as? String {
      let url = uri.hasPrefix("file://") ? URL(string: uri) : URL(fileURLWithPath: uri)
      if let path = url?.path, let image = UIImage(contentsOfFile: path) { drawHanjiImage(image, in: rect, fit: item["fit"] as? String ?? "contain", rotation: (item["rotation"] as? NSNumber)?.intValue ?? 0) }
      continue
    }
    guard let text = item["text"] as? String else { continue }
    let size = (item["fontSize"] as? NSNumber)?.doubleValue ?? 20
    let style = NSMutableParagraphStyle(); style.lineBreakMode = .byWordWrapping
    text.draw(in: rect, withAttributes: [.font: UIFont.systemFont(ofSize: size), .foregroundColor: UIColor(hanjiHex: item["color"] as? String ?? "#20201E"), .paragraphStyle: style])
  }
}

private func drawHanjiImage(_ image: UIImage, in rect: CGRect, fit: String, rotation: Int) {
  guard let context = UIGraphicsGetCurrentContext(), image.size.width > 0, image.size.height > 0 else { return }
  let normalized = ((rotation % 360) + 360) % 360, odd = normalized == 90 || normalized == 270
  let targetSize = odd ? CGSize(width: rect.height, height: rect.width) : rect.size
  let scaleX = targetSize.width / image.size.width, scaleY = targetSize.height / image.size.height
  let scale = fit == "cover" ? max(scaleX, scaleY) : min(scaleX, scaleY)
  let drawSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)
  context.saveGState(); context.clip(to: rect); context.translateBy(x: rect.midX, y: rect.midY); context.rotate(by: CGFloat(normalized) * .pi / 180)
  image.draw(in: CGRect(x: -drawSize.width / 2, y: -drawSize.height / 2, width: drawSize.width, height: drawSize.height))
  context.restoreGState()
}

private func drawHanjiTemplate(_ template: String, in bounds: CGRect, context: CGContext) {
  context.saveGState(); defer { context.restoreGState() }
  if template == "dark" {
    context.setFillColor(UIColor(red: 0.125, green: 0.145, blue: 0.133, alpha: 1).cgColor)
    context.fill(bounds)
    context.setStrokeColor(UIColor(red: 0.28, green: 0.32, blue: 0.29, alpha: 1).cgColor)
    context.setLineWidth(0.6)
    for y in stride(from: 28, to: bounds.height, by: 28) { context.move(to: CGPoint(x: 0, y: y)); context.addLine(to: CGPoint(x: bounds.width, y: y)) }
    context.strokePath(); return
  }
  context.setStrokeColor(UIColor(red: 0.86, green: 0.88, blue: 0.85, alpha: 1).cgColor)
  context.setFillColor(UIColor(red: 0.76, green: 0.79, blue: 0.75, alpha: 1).cgColor)
  context.setLineWidth(0.6)
  let step: CGFloat = template == "dot" ? 22 : 28
  if template == "line" || template == "grid" { for y in stride(from: step, to: bounds.height, by: step) { context.move(to: CGPoint(x: 0, y: y)); context.addLine(to: CGPoint(x: bounds.width, y: y)) } }
  if template == "grid" { for x in stride(from: step, to: bounds.width, by: step) { context.move(to: CGPoint(x: x, y: 0)); context.addLine(to: CGPoint(x: x, y: bounds.height)) } }
  if template == "dot" { for y in stride(from: step, to: bounds.height, by: step) { for x in stride(from: step, to: bounds.width, by: step) { context.fillEllipse(in: CGRect(x: x - 0.8, y: y - 0.8, width: 1.6, height: 1.6)) } } }
  if template == "cornell" {
    let splitX = bounds.width * 0.25, summaryY = bounds.height * 0.82
    context.move(to: CGPoint(x: splitX, y: 0)); context.addLine(to: CGPoint(x: splitX, y: summaryY))
    context.move(to: CGPoint(x: 0, y: summaryY)); context.addLine(to: CGPoint(x: bounds.width, y: summaryY))
    for y in stride(from: step, to: summaryY, by: step) { context.move(to: CGPoint(x: splitX, y: y)); context.addLine(to: CGPoint(x: bounds.width, y: y)) }
  }
  if template == "planner" {
    let margin = bounds.width * 0.03, top = bounds.height * 0.10, bottom = bounds.height * 0.96, cell = (bounds.width - margin * 2) / 7
    context.addRect(CGRect(x: margin, y: top, width: bounds.width - margin * 2, height: bottom - top))
    for column in 1..<7 { let x = margin + CGFloat(column) * cell; context.move(to: CGPoint(x: x, y: top)); context.addLine(to: CGPoint(x: x, y: bottom)) }
    for row in 1..<9 { let y = top + CGFloat(row) * (bottom - top) / 9; context.move(to: CGPoint(x: margin, y: y)); context.addLine(to: CGPoint(x: bounds.width - margin, y: y)) }
  }
  context.strokePath()
}
