# Edito

simple mobile editor with few tools

## working video

https://github.com/user-attachments/assets/2871042d-e486-4b8c-93bb-80651d0f9cc2

## Features

- add text overlay and drag to position
- add image overlay from gallery and drag to position and resize with pinch gesture
- add video overlay from gallery and drag to position and resize with pinch gesture(backend part not done yet)
- on backend side using ffmpeg to merge all overlays into single video

## Getting Started
### Installation

1. Clone the repository:
```bash
git clone https://github.com/jainex17/edito.git
cd edito
```

2. Install dependencies:
```bash
# frontend
cd frontend
npm install

# backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

3. Start the development server:
```bash
# android
npm run android
# ios
npm run ios

# backend
uvicorn main:app --reload
```

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request with your improvements.
