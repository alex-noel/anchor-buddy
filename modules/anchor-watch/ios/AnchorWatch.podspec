Pod::Spec.new do |s|
  s.name = 'AnchorWatch'
  s.version = '0.1.0'
  s.summary = 'Native, local-only Anchor Buddy supplemental anchor watch'
  s.description = 'CoreLocation monitoring with explicit arming, accuracy checks, local alerts and persisted interruption state.'
  s.author = 'Anchor Buddy'
  s.homepage = 'https://example.invalid/anchorbuddy'
  s.license = { :type => 'UNLICENSED' }
  s.platform = :ios, '16.0'
  s.swift_version = '5.9'
  s.source = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'CoreLocation', 'UserNotifications', 'UIKit'
  s.source_files = '**/*.{h,m,mm,swift}'
end
