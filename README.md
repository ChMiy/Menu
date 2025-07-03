# Restaurant Menu PWA

A high-end Progressive Web App (PWA) for displaying restaurant menus on tablets, with support for multiple languages and offline functionality.

## 🎯 Features

- Multi-language support (PT, EN, FR, ES)
- Offline-capable (PWA)
- Elegant, minimalist design
- Separate Food and Wine menus
- Touch-optimized for tablet use
- Easy content updates via GitHub

## 📱 Deployment Requirements

- GitHub Pages enabled repository
- HTTPS domain (required for PWA)
- Modern Android tablets for viewing

## 🖼️ Image Requirements

### Logo
- File: `/assets/logo.png`
- Format: PNG with transparent background
- Resolution: 500x500px recommended
- File size: < 200KB

### Menu Images
- Files: 
  - `/assets/menu-{lang}.jpg` (Food menu)
  - `/assets/wine-{lang}.jpg` (Wine list)
- Format: JPG
- Resolution: 2048x2732px (portrait tablet resolution)
- File size: < 1MB per image
- Quality: 80-90% compression

### Background Images
- Files:
  - `/assets/background-menu.jpg`
  - `/assets/background-wine.jpg`
- Format: JPG
- Resolution: 1920x1080px minimum
- File size: < 500KB per image
- Style: Subtle, desaturated food/wine imagery

### PWA Icons
- Files:
  - `/assets/icon-192.png`
  - `/assets/icon-512.png`
- Format: PNG
- Sizes: 192x192px and 512x512px
- Background: Deep blue (#0D1B2A)

## 🔄 Updating Content

1. **Menu Updates**
   - Replace corresponding JPG files in `/assets/`
   - Commit and push to GitHub
   - Changes will be live within 5 minutes

2. **Logo Update**
   - Replace `/assets/logo.png`
   - Maintain transparent background
   - Commit and push

3. **Background Images**
   - Replace corresponding JPG files
   - Ensure similar style and mood
   - Commit and push

## 🎨 Design System

### Colors
- Primary Background: Deep Blue (#0D1B2A)
- Accent: Elegant Gold (#D4AF37)
- Neutral: Soft Beige (#F5F5DC)
- Text on Dark: Light Crème (#F7F1E1)

### Typography
- Primary Font: EngraversGothic BT
- Fallback: Georgia, serif

## 📦 Development Setup

1. Clone repository
2. Place required font files in `/assets/fonts/`
3. Add all required images to `/assets/`
4. Enable GitHub Pages in repository settings
5. Push changes to `main` branch

## 🔧 Testing

1. Install to tablet via Chrome's "Add to Home Screen"
2. Test offline functionality
3. Verify all language variations
4. Check touch interactions
5. Validate PWA installation 