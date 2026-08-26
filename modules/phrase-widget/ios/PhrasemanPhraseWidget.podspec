Pod::Spec.new do |spec|
  # зачем: без podspec expo-modules-autolinking пропускает модуль целиком
  # (resolveModuleAsync возвращает null, когда *.podspec не найден), поэтому
  # PhraseWidgetModule.swift не попадал в сборку: requireOptionalNativeModule
  # отдавал null, isAvailable() был false, и syncWidgetData выходил на первой
  # строке — снимок для iOS-виджета не писался никогда.
  #
  # Имя выбрано так, чтобы не столкнуться ни с чем:
  #  - НЕ "PhraseWidget" — так зовётся Xcode-таргет WidgetKit-расширения
  #    (targets/widget/expo-target.config.js);
  #  - НЕ "PhraseWidgetModule" — имя пода становится именем Swift-модуля, а так
  #    уже назван класс внутри (конфликт имени модуля и типа). Рабочий
  #    learning-v2-pcm-decoder разводит их той же схемой.
  spec.name = "PhrasemanPhraseWidget"
  spec.version = "1.0.0"
  spec.summary = "Bridge that publishes the personal-deck snapshot to the iOS widget"
  spec.description = "Writes the RN-owned widget snapshot into the shared App Group container and asks WidgetKit to reload its timelines. The widget extension only ever reads."
  spec.license = { :type => "MIT" }
  spec.author = "Phraseman"
  spec.homepage = "https://phraseman.com"
  spec.platforms = { :ios => "15.1" }
  spec.swift_version = "5.9"
  spec.source = { :path => "." }
  spec.static_framework = true
  spec.dependency "ExpoModulesCore"
  spec.frameworks = "WidgetKit"
  spec.source_files = "**/*.swift"
  spec.pod_target_xcconfig = { "DEFINES_MODULE" => "YES" }
end
