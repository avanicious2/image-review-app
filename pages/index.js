// pages/index.js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  Box,
  VStack,
  HStack,
  Button,
  Text,
  Container,
  Image
} from '@chakra-ui/react';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reviewCounter, setReviewCounter] = useState(0);
  const [currentImageUrl, setCurrentImageUrl] = useState('');

  const fetchImages = async (userEmail) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/images?email=${encodeURIComponent(userEmail || email)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load images');
      }

      setImages(data || []);
      setCurrentIndex(0);

      // If we have images, fetch the S3 URL for the first image
      if (data && data.length > 0) {
        await fetchImageUrl(data[0]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  const fetchImageUrl = async (imageData) => {
    try {
      const response = await fetch('/api/gen-s3-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alle_ingestion_id: imageData.alle_ingestion_id,
          alle_media_key: imageData.alle_media_key
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image URL');
      }

      setCurrentImageUrl(data.url);
    } catch (err) {
      setError('Failed to load image URL');
      console.error('Error fetching image URL:', err);
    }
  };

  useEffect(() => {
    const savedEmail = localStorage.getItem('userEmail');
    const savedIndex = localStorage.getItem('currentImageIndex');
    const savedImages = localStorage.getItem('images');
    
    if (savedEmail) {
      setEmail(savedEmail);
      setIsAuthenticated(true);

      if (savedImages) {
        const parsedImages = JSON.parse(savedImages);
        setImages(parsedImages);
        const index = savedIndex ? parseInt(savedIndex, 10) : 0;
        setCurrentIndex(index);
        if (parsedImages[index]) {
          fetchImageUrl(parsedImages[index]);
        }
      } else {
        fetchImages(savedEmail);
      }
    }
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      localStorage.setItem('userEmail', email);
      setIsAuthenticated(true);
      fetchImages(email);
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async (score) => {
    if (submitting) return;
    setSubmitting(true);
    setError('');

    try {
      const currentImage = images[currentIndex];
      const response = await fetch('/api/submit-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alle_ingestion_id: currentImage.alle_ingestion_id,
          review_score: score,
          reviewer_email: email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      setReviewCounter((prev) => prev + 1);

      if (currentIndex < images.length - 1) {
        const newIndex = currentIndex + 1;
        setCurrentIndex(newIndex);
        localStorage.setItem('currentImageIndex', newIndex.toString());
        // Fetch URL for next image
        await fetchImageUrl(images[newIndex]);
      } else {
        setCurrentIndex(images.length);
        localStorage.removeItem('currentImageIndex');
      }
    } catch (err) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    return () => {
      localStorage.setItem('currentImageIndex', currentIndex.toString());
    };
  }, [currentIndex]);

  return (
    <Box 
      minH="100dvh" 
      bg="gray.100" 
      position="relative"
      pb="env(safe-area-inset-bottom)"
    >
      <Head>
        <title>Image Review App</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>

      {error && (
        <Box maxW="md" mx="auto" mt={4} p={4} bg="red.100" color="red.700" borderRadius="md">
          {error}
        </Box>
      )}

      {!isAuthenticated ? (
        <Container maxW="md" py={10}>
          <Box bg="white" p={6} borderRadius="lg" boxShadow="lg">
            <Text fontSize="2xl" fontWeight="bold" mb={4}>Login to Review Images</Text>
            <form onSubmit={handleAuth}>
              <Box mb={4}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  required
                />
              </Box>
              <Box mb={4}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  required
                />
              </Box>
              <Button 
                type="submit" 
                isLoading={loading}
                loadingText="Logging in..."
                w="full" 
                colorScheme="blue"
              >
                Login
              </Button>
            </form>
          </Box>
        </Container>
      ) : loading ? (
        <VStack justify="center" align="center" h="100dvh">
          <Text>Loading...</Text>
        </VStack>
      ) : !images.length || currentIndex >= images.length ? (
        <VStack justify="center" align="center" h="100dvh">
          <Text fontSize="xl" fontWeight="bold">Session Complete!</Text>
          <Text fontSize="md" mb={2}>You reviewed {reviewCounter} images</Text>
          <Text fontSize="sm">Start new session to review more images</Text>
          <Button 
            mt={4} 
            colorScheme="blue" 
            onClick={() => {
              localStorage.removeItem('currentImageIndex');
              window.location.reload();
            }}
          >
            Start New Session
          </Button>
        </VStack>
      ) : (
        <Box 
          maxW="sm" 
          mx="auto" 
          h="100dvh"
          display="flex"
          flexDirection="column"
          position="relative"
        >
          <Box 
            flex="1"
            overflow="auto"
            bg="white"
            borderRadius="lg"
            boxShadow="lg"
            m={4}
          >
            <Box position="relative" pt="100%">
              {currentImageUrl && (
                <Image
                  src={currentImageUrl}
                  alt="Review Image"
                  objectFit="contain"
                  position="absolute"
                  top="0"
                  width="100%"
                  height="100%"
                  pointerEvents="none"
                />
              )}
            </Box>

            <Box p={4}>
              <Text fontSize="sm" color="gray.500" mb={1}>Images reviewed: {reviewCounter}</Text>
              <Text fontSize="sm" color="gray.500" mb={2}>ID: {images[currentIndex].id}</Text>
            </Box>
          </Box>

          <Box
            position="sticky"
            bottom={0}
            left={0}
            right={0}
            bg="white"
            borderTopWidth={1}
            borderBottomWidth={1}
            borderColor="gray.200"
            p={4}
            pt="env(safe-area-inset-bottom)"
            pb="env(safe-area-inset-bottom)"
          >
            <HStack justify="space-between" align="center">
              <Button
                onClick={() => submitReview(0)}
                isLoading={submitting}
                loadingText="..."
                colorScheme="red"
                size="lg"
                borderRadius="full"
                flex={1}
                py={6}
                fontSize="xl"
              >
                👎 Dislike
              </Button>
              <Button
                onClick={() => submitReview(1)}
                isLoading={submitting}
                loadingText="..."
                colorScheme="green"
                size="lg"
                borderRadius="full"
                flex={1}
                py={6}
                fontSize="xl"
              >
                👍 Like
              </Button>
            </HStack>
          </Box>
        </Box>
      )}
    </Box>
  );
}