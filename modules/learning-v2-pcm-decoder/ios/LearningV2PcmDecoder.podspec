Pod::Spec.new do |spec|
  spec.name = "LearningV2PcmDecoder"
  spec.version = "1.0.0"
  spec.summary = "Bounded local audio decode metrics for Learning V2"
  spec.description = "Decodes an exact local audio file with AVAudioFile and returns aggregate PCM metrics only."
  spec.license = { :type => "MIT" }
  spec.author = "Phraseman"
  spec.homepage = "https://phraseman.com"
  spec.platforms = { :ios => "15.1" }
  spec.swift_version = "5.9"
  spec.source = { :path => "." }
  spec.static_framework = true
  spec.dependency "ExpoModulesCore"
  spec.frameworks = "AVFoundation", "CryptoKit"
  spec.source_files = "**/*.swift"
  spec.pod_target_xcconfig = { "DEFINES_MODULE" => "YES" }
end
