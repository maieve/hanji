import ExpoModulesCore
import UIKit

public final class HanjiColorPickerModule: Module {
  private var coordinator: HanjiColorPickerCoordinator?

  public func definition() -> ModuleDefinition {
    Name("HanjiColorPicker")
    AsyncFunction("pickColor") { (initialHex: String, promise: Promise) in
      DispatchQueue.main.async {
        guard let presenter = Self.topViewController() else {
          promise.reject("E_NO_VIEW_CONTROLLER", "색상 선택기를 표시할 화면을 찾지 못했습니다.")
          return
        }
        let picker = UIColorPickerViewController()
        picker.selectedColor = UIColor(hanjiHex: initialHex)
        picker.supportsAlpha = false
        picker.title = "잉크 색상"
        let coordinator = HanjiColorPickerCoordinator { [weak self] color in
          self?.coordinator = nil
          promise.resolve(color.map(Self.hexString) ?? initialHex)
        }
        self.coordinator = coordinator
        picker.delegate = coordinator
        picker.presentationController?.delegate = coordinator
        presenter.present(picker, animated: true)
        picker.presentationController?.delegate = coordinator
      }
    }
  }

  private static func topViewController() -> UIViewController? {
    let root = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.flatMap(\.windows).first { $0.isKeyWindow }?.rootViewController
    var current = root
    while let presented = current?.presentedViewController { current = presented }
    if let navigation = current as? UINavigationController { return navigation.visibleViewController ?? navigation }
    if let tabs = current as? UITabBarController { return tabs.selectedViewController ?? tabs }
    return current
  }

  private static func hexString(_ color: UIColor) -> String {
    var red: CGFloat = 0, green: CGFloat = 0, blue: CGFloat = 0, alpha: CGFloat = 0
    guard color.getRed(&red, green: &green, blue: &blue, alpha: &alpha) else { return "#20201E" }
    return String(format: "#%02X%02X%02X", Int(round(red * 255)), Int(round(green * 255)), Int(round(blue * 255)))
  }
}

private final class HanjiColorPickerCoordinator: NSObject, UIColorPickerViewControllerDelegate, UIAdaptivePresentationControllerDelegate {
  private var completion: ((UIColor?) -> Void)?
  private var selectedColor: UIColor?

  init(completion: @escaping (UIColor?) -> Void) { self.completion = completion }

  func colorPickerViewController(_ viewController: UIColorPickerViewController, didSelect color: UIColor, continuously: Bool) {
    selectedColor = color
  }

  func colorPickerViewControllerDidFinish(_ viewController: UIColorPickerViewController) {
    finish(viewController.selectedColor)
  }

  func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
    finish(selectedColor)
  }

  private func finish(_ color: UIColor?) {
    guard let completion else { return }
    self.completion = nil
    completion(color)
  }
}
