import { logger } from "../../utils/Logger";
import ollama, { GenerateResponse } from "ollama";

class OllamaClient {
  private completion: GenerateResponse | undefined;
  private model: string = "llama3" //llama3, mistral

  constructor() {
    logger.info("Ollama client initiated.");
  }

  public getCompletionContent(): string {
    if (this.completion !== undefined) {
      return this.completion.response;
    } else {
      logger.error(
        "Completion is undefined. Send a prompt to get the completion content."
      );
      return "";
    }
  }

  public async categorizeProducts(
    discountProducts: string,
    productCategories: string
  ): Promise<void> {
    const onlyJson = "Only respond with the completed JSON, without a code block wrapper. ";
    const inputJson = `The JSON structure to complete: '${discountProducts}'. `;
    const infoJson = `The ProductCategories JSON structure: '${productCategories}'. `;
    const removeName = "In the response only keep the 'id' and 'category' to minimize token use. ";
    const prompt = "Match the products with a single product category. For each 'productName' fill the 'category' key, with the 'id' key of corresponding ProductCategories. ";
    const customizedPrompt = prompt + inputJson + infoJson + onlyJson + removeName;
    logger.debug("GPT Request:", customizedPrompt);

    try {
      await this.sendPrompt(customizedPrompt);
    } catch (error) {
      logger.error("Failed to get response:", error);
      process.exit(1);
    }
  }

  public async sendPrompt(prompt: string): Promise<void> {
    logger.info("Sending prompt to Ollama...");

    this.completion = await ollama.generate({
      model: this.model,
      prompt: prompt,
      
      keep_alive: 600000, // 5 min
      options: { // For reproducible outputs
        seed: 123,
        temperature: 0,
      }
    });

    logger.debug("Response:", this.completion);
  }
}

export default OllamaClient;
