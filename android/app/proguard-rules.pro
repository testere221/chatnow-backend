# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Add any project specific keep options here:

# React Native optimizations
-keep class com.facebook.react.** { *; }
-keep class com.facebook.jni.** { *; }

# Expo optimizations
-keep class expo.modules.** { *; }
-keep class com.facebook.react.bridge.** { *; }

# ChatNow specific
-keep class com.ferhatkortak2.chatnow.** { *; }

# React Native Image components - Sadece resimler için
-keep class com.facebook.react.views.image.** { *; }
-keep class com.facebook.react.modules.image.** { *; }
-keep class com.facebook.imagepipeline.** { *; }
-keep class com.facebook.drawee.** { *; }

# Image loading and caching - Resim cache için
-keep class com.bumptech.glide.** { *; }
-keep class com.facebook.fresco.** { *; }

# AsyncStorage ve cache sistemi - Resim cache için kritik
-keep class com.reactnativecommunity.asyncstorage.** { *; }
-keep class com.facebook.react.modules.storage.** { *; }

# File system - Resim dosyaları için
-keep class expo.modules.filesystem.** { *; }
-keep class expo.modules.imagepicker.** { *; }

# Network ve HTTP - Resim indirme için
-keep class okhttp3.** { *; }
-keep class retrofit2.** { *; }

# React Native Image components - Daha agresif
-keep class com.facebook.react.uimanager.** { *; }
-keep class com.facebook.react.views.** { *; }
-keep class com.facebook.react.bridge.** { *; }

# Base64 ve data URI desteği
-keep class java.util.Base64** { *; }
-keep class android.util.Base64** { *; }

# File system ve storage - Daha kapsamlı
-keep class expo.modules.** { *; }
-keep class com.facebook.react.modules.** { *; }

# Image processing ve optimization
-keep class com.facebook.imagepipeline.** { *; }
-keep class com.facebook.drawee.** { *; }
-keep class com.bumptech.glide.** { *; }
-keep class com.facebook.fresco.** { *; }

# Memory ve cache management - Kritik!
-keep class java.util.Map** { *; }
-keep class java.util.HashMap** { *; }
-keep class java.util.concurrent.** { *; }
-keep class android.graphics.** { *; }
-keep class android.media.** { *; }

# React Native Image cache - AAB için ultra agresif
-keep class com.facebook.react.modules.image.** { *; }
-keep class com.facebook.react.views.image.** { *; }
-keep class com.facebook.react.uimanager.** { *; }
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.soloader.** { *; }

# AAB için ekstra koruma
-keep class expo.modules.imagepicker.** { *; }
-keep class expo.modules.camera.** { *; }
-keep class expo.modules.media.** { *; }
-keep class expo.modules.** { *; }

# AsyncStorage ve persistence
-keep class com.reactnativecommunity.asyncstorage.** { *; }
-keep class com.facebook.react.modules.storage.** { *; }
-keep class expo.modules.filesystem.** { *; }