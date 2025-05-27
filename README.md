# KenkoAssist

[![Release](https://img.shields.io/github/v/release/johnjehiel/kenkoassist)](https://github.com/johnjehiel/kenkoassist/releases/latest)
[![Android](https://img.shields.io/badge/Platform-Android-green.svg)](https://developer.android.com)
[![Issues](https://img.shields.io/github/issues/johnjehiel/kenkoassist)](https://github.com/johnjehiel/kenkoassist/issues)

**KenkoAssist** is a privacy-focused Android application that enables on-device chat interactions with Large Language Models (LLMs). Built with health and wellness in mind, it provides personalized AI assistance while keeping your data completely private by running models locally on your device.

## Key Features

### On-Device AI Chat
- **Local LLM Execution**: Run GGUF format models directly on your Android device
- **Privacy First**: All conversations stay on your device - no data sent to external servers
- **Custom Characters**: Create and customize AI assistants with unique personalities and behaviors
- **Multiple Model Support**: Load and switch between different LLMs based on your needs

### Personalization
- **User Profile Management**: Customize and personalize your user experience
- **Character Creation**: Design AI assistants tailored to specific use cases
- **Theme Customization**: Switch between multiple visual themes
- **Text-to-Speech**: Listen to AI responses with built-in TTS functionality

### Health Integration
- **Fitness App Connectivity**: Seamlessly connect with popular fitness applications
- **Health Metrics Analysis**: Get personalized health insights based on your data
- **Specialized Health LLM**: Fine-tuned model for health and wellness assistance
- **Privacy-Preserving**: Health data processing happens entirely on-device

### Developer Features
- **Debug Mode**: Advanced debugging capabilities for developers
- **Extensible Architecture**: Built for customization and enhancement

## Installation

### Prerequisites
- Android device with atleast 4GB RAM for model inference
- Android 7.0 (API 24) or higher

### Download
1. Visit the [releases page](https://github.com/johnjehiel/kenkoassist/releases/latest)
2. Download the latest APK file
3. Install the APK on your Android device
4. Grant necessary permissions when prompted

> **Note**: KenkoAssist is currently available exclusively for Android platforms.

## Getting Started

### Loading Your First Model

KenkoAssist uses [llama.cpp](https://github.com/ggerganov/llama.cpp) for efficient on-device model execution.

1. **Obtain a GGUF Model**: Download a compatible GGUF format model
2. **Import Model**: Navigate to `Models > Import Model` in the app
3. **Select File**: Choose your GGUF model file from device storage
4. **Import**: Tap 'Import Model' to copy the file into the application
5. **Load & Chat**: Select the imported model and start your conversation

> **Performance Note**: Inference speed and performance depend on your device's specifications, particularly RAM and CPU capabilities.

### Health Metrics Integration

Transform KenkoAssist into your personal health companion by enabling health metrics integration.

#### Setup Requirements
- Install any fitness application (Google Fit, Samsung Health, etc.)
- Install [Health Connect](https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata)
- Grant Health Connect permissions to read data from your fitness app

#### Recommended Health LLM
For optimal health assistance, we recommend using our specialized Personal Health LLM:

**Quick Download**: [Personal Health LLM (Q4_K_M)](https://huggingface.co/johnjehiel/personal-health-LLM-Llama-3.2-1B-Instruct-DPO-GGUF/resolve/main/unsloth.Q4_K_M.gguf?download=true)

**All Variants**: [View all quantized versions](https://huggingface.co/johnjehiel/personal-health-LLM-Llama-3.2-1B-Instruct-DPO-GGUF/tree/main)

This model is specifically fine-tuned to provide personalized health assistance based on user health metrics, queries, and concerns. Learn more about the fine-tuning process in our [personal-health-llm repository](https://github.com/johnjehiel/personal-health-llm).

## Development

### Development Environment Setup

#### Prerequisites
- Node.js (v16+ recommended)
- Java 17 or 21 SDK
- Android SDK (Android Studio is optional)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- Git

#### Quick Start
```bash
# Clone the repository
git clone https://github.com/johnjehiel/kenkoassist.git
cd kenkoassist

# Install dependencies
npm install

# Run development build
npx expo run:android
```

### Building Production APK

For creating production builds using EAS (Expo Application Services):

```bash
# Install dependencies
npm install

# Login to EAS (create account if needed)
eas login

# Configure build settings
eas build:configure

# Build for Android
eas build --platform android
```

Follow the interactive prompts to configure your build settings according to your requirements.

## Contributing

We welcome contributions from the community! Whether it's bug fixes, feature enhancements, or documentation improvements, your help makes KenkoAssist better for everyone.

### How to Contribute
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Reporting Issues
Found a bug or have a feature request? Please check our [issue tracker](https://github.com/johnjehiel/kenkoassist/issues) and create a new issue if one doesn't already exist.

## Privacy & Security

KenkoAssist is built with privacy as a core principle:
- **No Data Collection**: Your conversations never leave your device
- **Local Processing**: All AI inference happens on-device
- **Health Data Privacy**: Health metrics are processed locally

## Support & Community

- **Issues**: [GitHub Issues](https://github.com/johnjehiel/kenkoassist/issues)
- **Releases**: [Release Notes](https://github.com/johnjehiel/kenkoassist/releases)

## ⚠️ Disclaimer

KenkoAssist is designed to provide AI-powered assistance and should not replace professional medical advice. Always consult with healthcare professionals for medical decisions and concerns.