# PrintMaster

PrintMaster is an advanced web-based **Smart Photo Album & Print Layout Designer** application. It is designed for print shops and photo studios to easily format, customize, style, and export high-DPI prints, collage sheets, and custom wedding albums in A4 and A3 sizes.

## 🚀 Key Features

*   **A4 Page Designer**: Format prints for Aadhar Cards, PAN Cards, Passport Photos, Wallet Size, and custom photo dimensions.
*   **A3 Page Designer (Saadi Album)**: Create custom layouts, collage sheets, and premium Indian wedding album designs.
*   **Indian Wedding Templates**: Traditional maroon/gold ("शुभ विवाह"), luxury gold satin, royal teal peacock, and rosewood themed templates.
*   **Drag-and-Resize Editor**: Move and resize image/text blocks freely with intuitive handles on the canvas.
*   **Canvas Background & Borders**: Apply custom background colors, preset premium gradients (Crimson Romance, Classic Gold, Imperial Blue, etc.), custom backdrop images, and configure outer canvas borders.
*   **Layer Styling Controls**: Customize individual layer border styles (width, color, type), rounded corners, opacity, drop shadows, rotation, and alignment.
*   **AI Background Removal**: Instantly remove backgrounds from images inside the browser using optimized AI models.
*   **High-Quality PDF/Image Export**: Download print-ready files up to 800 DPI.
*   **Undo/Redo History**: Full tracking of canvas modifications.

---

## 🛠️ Setup & Installation

### Prerequisites
*   [Node.js](https://nodejs.org/) (Version 18 or above recommended)
*   [Git](https://git-scm.com/) (Optional, to push/pull from GitHub)

### Running Locally

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/bagakashyap2222-star/PrintMaster.git
    cd PrintMaster
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**:
    Create a `.env.local` file in the root folder and add your Gemini API Key:
    ```env
    GEMINI_API_KEY=your_gemini_api_key_here
    ```

4.  **Start Development Server**:
    ```bash
    npm run dev
    ```
    Open your browser and navigate to `http://localhost:3000/`.

---

## 📦 Tech Stack
*   **Frontend Framework**: React 19, TypeScript
*   **Build Tool**: Vite
*   **Styling**: Tailwind CSS, CSS
*   **Key Libraries**:
    *   `@imgly/background-removal` (On-demand client-side AI image processing)
    *   `jspdf` & `dom-to-image` (High-resolution print export engine)
    *   `lucide-react` (Iconography)
