# Offline NLP Native Bridge Notes

This folder uses `DriveLegalNlp` (`NativeModules`) from Android native code.

## Native scaffold location

- `native/android/com/drivelegal/nlp/DriveLegalNlpModule.kt`
- `native/android/com/drivelegal/nlp/DriveLegalNlpPackage.kt`

## Integration steps for real device builds

1. Run Expo prebuild to generate the Android project.
2. Copy module/package files into your generated Android source set (for example under `android/app/src/main/java/com/drivelegal/nlp`).
3. Register `DriveLegalNlpPackage` inside your `MainApplication` package list.
4. Add Google AI Edge MediaPipe LLM Inference dependency in Android Gradle.
5. Place your local int4 model file (for example Gemma 3 1B int4 `.task`) at:
   - `file:///data/user/0/com.drivelegal/files/models/gemma-3-1b-it-int4.task`

The TypeScript service calls the native bridge with mutex-style serialized operations and explicit session cleanup to reduce JNI memory crash risk.
