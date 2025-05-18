import React, { useState } from "react";
import {
  Box,
  Button,
  Image,
  Select,
  Spinner,
  Text,
  VStack,
  HStack,
  Link,
  SimpleGrid,
  Wrap,
} from "@chakra-ui/react";
import { backendUrl } from "./base";

const modelOptions = [
  "u2net",
  "u2netp",
  "u2net_human_seg",
  "u2net_cloth_seg",
  "silueta",
  "isnet-general-use",
  "isnet-anime",
  "sam",
  "birefnet-general",
  "birefnet-general-lite",
  "birefnet-portrait",
  "birefnet-dis",
  "birefnet-hrsod",
  "birefnet-cod",
  "birefnet-massive",
];

export default function RemoveBg() {
  const [file, setFile] = useState(null);
  const [model, setModel] = useState(modelOptions[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleSubmit() {
    if (!file) {
      alert("Please select an image file first.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("model_name", model);

    try {
      const res = await fetch(`${backendUrl}/remove-bg/`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to process image");
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const allFiles = result && [
    {
      name: "Original",
      url: result?.original,
    },
    {
      name: "A4 Size",
      url: result?.a4,
    },
    {
      name: "A3 Size",
      url: result?.a3,
    },
    {
      name: "Mask",
      url: result?.mask,
    },
    {
      name: "Black BG",
      url: result?.black_bg,
    },
    {
      name: "White BG",
      url: result?.white_bg,
    },
    {
      name: "Red BG",
      url: result?.red_bg,
    },
    {
      name: "ICO Icon",
      url: result?.ico,
    },
    {
      name: "ZIP",
      url: result?.zip,
    },
  ];

  return (
    <Box maxW="container.md" mx="auto" p={6}>
      <VStack spacing={4} align="stretch">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files[0])}
        />

        <Select value={model} onChange={(e) => setModel(e.target.value)}>
          {modelOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </Select>

        <Button colorScheme="green" onClick={handleSubmit} isDisabled={loading}>
          {loading ? <Spinner size="sm" mr={2} /> : null} Remove Background
        </Button>

        {error && (
          <Text color="red.500" fontWeight="bold">
            Error: {error}
          </Text>
        )}

        {result && (
          <Box>
            <Text fontWeight="bold" mb={2}>
              Results:
            </Text>
            <SimpleGrid columns={2} spacing={4}>
              {allFiles.map(
                ({ name, url }) =>
                  url.endsWith(".png") && (
                    <Box key={name}>
                      <Text fontWeight="semibold">{name}:</Text>
                      <Image
                        src={`${backendUrl}${url}`}
                        alt={name}
                        maxH="200px"
                        border="1px solid #ccc"
                        borderRadius="md"
                      />
                    </Box>
                  )
              )}
            </SimpleGrid>
            <HStack
              as={HStack}
              spacing={4}
              mt={4}
              borderTop="1px solid #ccc"
              pt={4}
              justify="center"
              align="center"
              textAlign="center"
            >
              {allFiles.map(({ name, url }) => (
                <HStack key={name} spacing={4}>
                  <Link
                    href={`${backendUrl}${url}`}
                    isExternal
                    color="teal.500"
                    fontWeight="bold"
                  >
                    {name}
                  </Link>
                </HStack>
              ))}
            </HStack>
          </Box>
        )}
      </VStack>
    </Box>
  );
}
