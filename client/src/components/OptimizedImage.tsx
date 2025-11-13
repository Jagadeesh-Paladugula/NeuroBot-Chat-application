/**
 * OptimizedImage Component
 * 
 * Provides lazy loading and image optimization for better performance
 * 
 * @example
 * ```tsx
 * <OptimizedImage
 *   src="/path/to/image.jpg"
 *   alt="Description"
 *   width={200}
 *   height={200}
 *   loading="lazy"
 * />
 * ```
 */

import { useState, useEffect, useRef, ImgHTMLAttributes } from 'react';
import styled from 'styled-components';

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  placeholder?: string;
  fallback?: string;
  onError?: () => void;
  onLoad?: () => void;
}

const ImageContainer = styled.div<{ width?: number; height?: number }>`
  position: relative;
  width: ${props => props.width ? `${props.width}px` : '100%'};
  height: ${props => props.height ? `${props.height}px` : 'auto'};
  overflow: hidden;
  background: #f3f4f6;
  border-radius: 8px;

  .dark-mode & {
    background: #1e293b;
  }
`;

const Image = styled.img<{ loaded: boolean }>`
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: ${props => props.loaded ? 1 : 0};
  transition: opacity 0.3s ease;

  &[loading="lazy"] {
    loading: lazy;
  }
`;

const Placeholder = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  color: #9ca3af;
  font-size: 0.875rem;

  .dark-mode & {
    background: #1e293b;
    color: #64748b;
  }
`;

const OptimizedImage = ({
  src,
  alt,
  width,
  height,
  loading = 'lazy',
  placeholder: placeholderSrc,
  fallback,
  onError,
  onLoad,
  ...props
}: OptimizedImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [imageSrc, setImageSrc] = useState(src);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setImageSrc(src);
    setLoaded(false);
    setError(false);
  }, [src]);

  const handleLoad = () => {
    setLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setError(true);
    if (fallback && imageSrc !== fallback) {
      setImageSrc(fallback);
      setError(false);
    } else {
      onError?.();
    }
  };

  // Use native lazy loading (browser support) or Intersection Observer
  // Modern browsers support native lazy loading, so we use that first
  // Intersection Observer is used as fallback for older browsers
  useEffect(() => {
    if (loading === 'lazy' && !('loading' in HTMLImageElement.prototype)) {
      // Fallback for browsers that don't support native lazy loading
      if ('IntersectionObserver' in window && imageRef.current) {
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting && entry.target instanceof HTMLImageElement) {
                const img = entry.target;
                if (img.dataset.src) {
                  img.src = img.dataset.src;
                  img.removeAttribute('data-src');
                }
                observer.unobserve(img);
              }
            });
          },
          { rootMargin: '50px' }
        );

        if (imageRef.current) {
          observer.observe(imageRef.current);
        }

        return () => {
          observer.disconnect();
        };
      }
    }
  }, [loading, imageSrc]);

  if (error && !fallback) {
    return (
      <ImageContainer width={width} height={height}>
        <Placeholder>Failed to load image</Placeholder>
      </ImageContainer>
    );
  }

  return (
    <ImageContainer width={width} height={height}>
      {!loaded && placeholderSrc && (
        <Placeholder>
          <img
            src={placeholderSrc}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </Placeholder>
      )}
      {!loaded && !placeholderSrc && (
        <Placeholder>Loading...</Placeholder>
      )}
      <Image
        ref={imageRef}
        src={imageSrc}
        alt={alt}
        loading={loading}
        loaded={loaded}
        onLoad={handleLoad}
        onError={handleError}
        width={width}
        height={height}
        {...props}
      />
    </ImageContainer>
  );
};

export default OptimizedImage;

