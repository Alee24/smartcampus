try:
    from PIL import Image, ImageDraw, ImageFont
    import os

    def create_icon(size, path):
         # Create a gradient-like background (flat blue for simplicity here)
        img = Image.new('RGB', (size, size), color = (37, 99, 235)) # Blue-600
        d = ImageDraw.Draw(img)
        
        # Draw a white shield rough shape or circle
        radius = size * 0.45
        center = size // 2
        d.ellipse([center-radius, center-radius, center+radius, center+radius], fill=(255,255,255))
        
        # Inner Blue Circle
        radius2 = size * 0.38
        d.ellipse([center-radius2, center-radius2, center+radius2, center+radius2], fill=(37, 99, 235))
        
        # Draw Checkmark (White) inside inner circle
        # Points for checkmark
        points = [
            (center - size*0.15, center), # Start
            (center - size*0.05, center + size*0.15), # Bottom
            (center + size*0.2, center - size*0.15)  # Top Right
        ]
        d.line(points, fill=(255,255,255), width=int(size*0.06), joint='curve')

        img.save(path)
        print(f"Saved {path}")

    output_dir = "../frontend/public"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    create_icon(192, os.path.join(output_dir, "pwa-192x192.png"))
    create_icon(512, os.path.join(output_dir, "pwa-512x512.png"))
    print("Icons generated successfully.")

except ImportError:
    print("Pillow not installed. Skipping icon generation.")
except Exception as e:
    print(f"Error generating icons: {e}")
