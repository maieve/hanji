Pod::Spec.new do |s|
  s.name             = 'HanjiCanvas'
  s.version          = '0.1.0'
  s.summary          = 'Native PencilKit, PDFKit, Vision, and Speech modules for yoojin note'
  s.description      = 'Local Expo modules that power the native iPad document canvas and on-device services.'
  s.license          = { :type => 'MIT' }
  s.author           = { 'allen' => 'hmj2088@naver.com' }
  s.homepage         = 'https://github.com/maieve/hanji'
  s.platforms        = { :ios => '17.0' }
  s.swift_version    = '5.9'
  s.source           = { :git => 'https://github.com/maieve/hanji.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
  s.source_files = '**/*.{h,m,mm,swift}'
end
