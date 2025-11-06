"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Send, MessageCircle, Loader } from "lucide-react"

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
}

// Custom markdown parser component
const MarkdownText = ({ content }: { content: string }) => {
  const parseMarkdown = (text: string) => {
    const lines = text.split('\n')
    const elements: React.ReactNode[] = []
    let listItems: string[] = []
    let key = 0
    
    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${key++}`} className="list-disc ml-4 my-2 space-y-1">
            {listItems.map((item, idx) => (
              <li key={idx} className="text-sm leading-relaxed">{parseInline(item)}</li>
            ))}
          </ul>
        )
        listItems = []
      }
    }

    lines.forEach((line, lineIdx) => {
      const trimmedLine = line.trim()
      
      // Check for horizontal rule (3 or more dashes, asterisks, or underscores)
      if (/^[-*_]{3,}$/.test(trimmedLine)) {
        flushList()
        elements.push(
          <hr key={`hr-${key++}`} className="my-4 border-t-2 border-gray-300" />
        )
      }
      // Check for headers
      else if (line.startsWith('### ')) {
        flushList()
        elements.push(
          <h3 key={`h3-${key++}`} className="text-base font-bold mt-2 mb-1 text-gray-900">
            {parseInline(line.substring(4))}
          </h3>
        )
      } else if (line.startsWith('## ')) {
        flushList()
        elements.push(
          <h2 key={`h2-${key++}`} className="text-lg font-bold mt-3 mb-2 text-gray-900">
            {parseInline(line.substring(3))}
          </h2>
        )
      } else if (line.startsWith('# ')) {
        flushList()
        elements.push(
          <h1 key={`h1-${key++}`} className="text-xl font-bold mt-3 mb-2 text-gray-900">
            {parseInline(line.substring(2))}
          </h1>
        )
      }
      // Check for list items
      else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        listItems.push(line.trim().substring(2))
      }
      // Check for numbered lists
      else if (/^\d+\.\s/.test(line.trim())) {
        flushList()
        const content = line.trim()
        elements.push(
          <div key={`num-${key++}`} className="my-1 text-sm leading-relaxed">
            {parseInline(content)}
          </div>
        )
      }
      // Regular paragraph
      else if (line.trim()) {
        flushList()
        elements.push(
          <p key={`p-${key++}`} className="text-sm leading-relaxed my-1">
            {parseInline(line)}
          </p>
        )
      }
      // Empty line
      else {
        flushList()
      }
    })
    
    flushList()
    return <>{elements}</>
  }

  const parseInline = (text: string) => {
    const parts: React.ReactNode[] = []
    let remaining = text
    let partKey = 0
    
    // Parse bold (**text**) and code (`text`)
    const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g
    let lastIndex = 0
    let match
    
    while ((match = pattern.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${partKey++}`}>
            {text.substring(lastIndex, match.index)}
          </span>
        )
      }
      
      const matchedText = match[0]
      
      // Bold formatting
      if (matchedText.startsWith('**') && matchedText.endsWith('**')) {
        parts.push(
          <strong key={`bold-${partKey++}`} className="font-bold text-gray-900">
            {matchedText.slice(2, -2)}
          </strong>
        )
      }
      // Code formatting
      else if (matchedText.startsWith('`') && matchedText.endsWith('`')) {
        parts.push(
          <code key={`code-${partKey++}`} className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">
            {matchedText.slice(1, -1)}
          </code>
        )
      }
      
      lastIndex = pattern.lastIndex
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <span key={`text-${partKey++}`}>
          {text.substring(lastIndex)}
        </span>
      )
    }
    
    return parts.length > 0 ? <>{parts}</> : text
  }

  return <div className="prose prose-sm max-w-none">{parseMarkdown(content)}</div>
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hello! I'm powered by Cohere Command A. How can I assist you today?",
      role: "assistant",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      role: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    try {
      const apiMessages = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))
      apiMessages.push({
        role: "user",
        content: userMessage.content,
      })

      const response = await fetch("https://api.cohere.ai/v2/chat", {
        method: "POST",
        headers: {
          Authorization: `Bearer Ao55hFwJlLZ7RvMds2z4hiqWmqb57PBVrrDYgmLJ`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "command-a-03-2025",
          messages: apiMessages,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to get response from Cohere API")
      }

      const data = await response.json()
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.message.content[0].text,
        role: "assistant",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Error:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I encountered an error. Please try again.",
        role: "assistant",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl h-[600px] flex flex-col shadow-2xl bg-white border-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-lg text-white flex items-center gap-3">
          <MessageCircle className="w-6 h-6" />
          <div>
            <h1 className="text-xl font-bold">Cohere AI Assistant</h1>
            <p className="text-sm text-blue-100">Powered by Command A</p>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-3 rounded-lg ${
                  message.role === "user"
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
                }`}
              >
                {message.role === "assistant" ? (
                  <MarkdownText content={message.content} />
                ) : (
                  <p className="text-sm leading-relaxed">{message.content}</p>
                )}
                <span className={`text-xs mt-2 block ${message.role === "user" ? "text-blue-100" : "text-gray-500"}`}>
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-800 border border-gray-200 px-4 py-3 rounded-lg rounded-bl-none">
                <div className="flex items-center gap-2">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 bg-white rounded-b-lg">
          <div className="flex gap-3">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 border-gray-300 focus:ring-blue-500 focus:border-blue-500"
            />
            <Button
              onClick={sendMessage}
              disabled={isLoading || !inputValue.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 flex gap-2 items-center"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </Button>
          </div>
        </div>
      </Card>
    </main>
  )
}
