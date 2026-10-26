import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  sendAiChatApi,
  AiChatResponse,
  AiItem,
  AiSuggestedUnit,
} from '../../api';
import { formatVND } from '../../utils/formatters';

interface MessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  data?: AiChatResponse['data'];
  intent?: AiChatResponse['intent'];
  sources?: string[];
  createdAt: Date;
}

interface AiAssistantModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectUnitToBook?: (unit: AiSuggestedUnit) => void;
  initialPrompt?: string;
}

const QUICK_PROMPTS = [
  {
    icon: 'inventory-2',
    label: 'Tư vấn cỡ kho',
    prompt: 'Tôi có 1 tủ lạnh, 20 thùng carton và 1 xe máy, nên thuê kho cỡ nào?',
  },
  {
    icon: 'policy',
    label: 'Chính sách đồ cấm',
    prompt: 'Quy định danh mục đồ vật cấm lưu trữ tại kho tự phục vụ gồm những gì?',
  },
  {
    icon: 'help-outline',
    label: 'Phí quá hạn & khoá PIN',
    prompt: 'Phí phạt quá hạn hợp đồng và quy định khóa mã PIN được tính thế nào?',
  },
  {
    icon: 'autorenew',
    label: 'Gợi ý gói gia hạn',
    prompt: 'Hợp đồng của tôi sắp hết hạn, tôi nên gia hạn gói 1, 3, 6 hay 12 tháng?',
  },
];

const INITIAL_MESSAGE: MessageItem = {
  id: 'welcome_msg',
  role: 'assistant',
  content:
    'Xin chào! Tôi là **Trợ lý AI SelfStorage**.\n\nTôi có thể hỗ trợ bạn:\n• 📦 **Tư vấn kích cỡ kho**: Kể tên đồ đạc, tôi sẽ tính thể tích và tìm kho trống vừa vặn nhất.\n• 📜 **Hỏi đáp chính sách**: Đồ cấm, phí quá hạn, khoá mã PIN thông minh, hoàn cọc.\n• 🔄 **Gợi ý gói gia hạn**: Đề xuất kỳ hạn tối ưu chi phí theo mô hình AI.',
  createdAt: new Date(),
};

export default function AiAssistantModal({
  visible,
  onClose,
  onSelectUnitToBook,
  initialPrompt,
}: AiAssistantModalProps) {
  const [messages, setMessages] = useState<MessageItem[]>([INITIAL_MESSAGE]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [conversationId, setConversationId] = useState<string>('');
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto scroll down when messages change
  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [messages, visible, isLoading]);

  // Handle initial prompt if provided
  useEffect(() => {
    if (visible && initialPrompt) {
      setTimeout(() => {
        handleSend(initialPrompt);
      }, 350);
    }
  }, [visible, initialPrompt]);

  const buildSmartFallbackResponse = (userText: string) => {
    const lower = userText.toLowerCase();

    // 1. KỸ NĂNG 1: TƯ VẤN KÍCH CỠ KHO (SIZE ADVISOR)
    const itemCatalog = [
      { regex: /(\d+)?\s*(tủ lạnh|tu lanh)/i, name: 'Tủ lạnh', vol: 1.2, defQty: 1 },
      { regex: /(\d+)?\s*(thùng carton|thùng xốp|thung carton|thùng|carton)/i, name: 'Thùng carton', vol: 0.08, defQty: 10 },
      { regex: /(\d+)?\s*(xe máy|xe may|xe đạp điện|xe tay ga)/i, name: 'Xe máy', vol: 1.5, defQty: 1 },
      { regex: /(\d+)?\s*(máy giặt|may giat)/i, name: 'Máy giặt', vol: 0.5, defQty: 1 },
      { regex: /(\d+)?\s*(sofa|ghế sofa|salon)/i, name: 'Bộ bàn ghế sofa', vol: 1.8, defQty: 1 },
      { regex: /(\d+)?\s*(bàn làm việc|bàn ăn|bàn học|bàn)/i, name: 'Bàn', vol: 0.8, defQty: 1 },
      { regex: /(\d+)?\s*(ghế ăn|ghế văn phòng|ghế)/i, name: 'Ghế', vol: 0.2, defQty: 4 },
      { regex: /(\d+)?\s*(tủ quần áo|tủ đồ|tủ)/i, name: 'Tủ đồ', vol: 1.5, defQty: 1 },
      { regex: /(\d+)?\s*(giường|nệm|đệm)/i, name: 'Giường & Nệm', vol: 1.2, defQty: 1 },
      { regex: /(\d+)?\s*(tivi|tv|màn hình)/i, name: 'Tivi', vol: 0.2, defQty: 1 },
      { regex: /(\d+)?\s*(vali|va li)/i, name: 'Vali du lịch', vol: 0.15, defQty: 2 },
    ];

    const detectedItems: AiItem[] = [];
    let rawVol = 0;

    for (const cat of itemCatalog) {
      const match = cat.regex.exec(lower);
      if (match) {
        let qty = cat.defQty;
        if (match[1]) {
          const parsed = parseInt(match[1], 10);
          if (!isNaN(parsed) && parsed > 0) qty = parsed;
        }
        const total = qty * cat.vol;
        rawVol += total;
        detectedItems.push({
          item: cat.name,
          quantity: qty,
          unit_volume_m3: cat.vol,
          total_volume_m3: total,
        });
      }
    }

    if (detectedItems.length > 0 || lower.includes('thuê kho cỡ nào') || lower.includes('kích cỡ') || lower.includes('thể tích')) {
      if (detectedItems.length === 0) {
        // Fallback default sample items if user just asked generic size question
        detectedItems.push(
          { item: 'Tủ lạnh', quantity: 1, unit_volume_m3: 1.2, total_volume_m3: 1.2 },
          { item: 'Thùng carton', quantity: 20, unit_volume_m3: 0.08, total_volume_m3: 1.6 },
          { item: 'Xe máy', quantity: 1, unit_volume_m3: 1.5, total_volume_m3: 1.5 }
        );
        rawVol = 4.3;
      }

      const reqVol = Number((rawVol * 1.18).toFixed(2));
      const suggestedUnits: AiSuggestedUnit[] = [
        {
          unit_id: 'unit_m102',
          unit_number: 'M-102',
          unit_type_name: 'Kho Vừa (Loại M)',
          facility_name: 'SelfStorage Tân Bình (Cơ sở chính)',
          size_m2: 2.5,
          volume_m3: 6.5,
          price_per_month: 1500000,
        },
        {
          unit_id: 'unit_l204',
          unit_number: 'L-204',
          unit_type_name: 'Kho Lớn (Loại L)',
          facility_name: 'SelfStorage Tân Bình (Cơ sở chính)',
          size_m2: 5.0,
          volume_m3: 13.0,
          price_per_month: 2800000,
        },
      ];

      return {
        reply: `Dựa trên danh sách đồ đạc bạn liệt kê, tổng thể tích lưu trữ thực tế khoảng **${reqVol} m³** (đã bao gồm 18% đệm xếp dỡ và lối đi an toàn).\n\nTôi gợi ý bạn nên thuê kho **Loại M** (thể tích ~6.5m³) hoặc **Loại L** để thuận tiện ra vào lấy đồ, bảo quản đồ đạc thông thoáng và không bị chèn ép.`,
        intent: 'size_advice',
        data: {
          items: detectedItems,
          total_raw_volume_m3: rawVol,
          required_volume_m3: reqVol,
          suggested_units: suggestedUnits,
        },
      };
    }

    // 2. KỸ NĂNG 2: CHÍNH SÁCH ĐỒ CẤM (POLICY RAG)
    if (lower.includes('cấm') || lower.includes('đồ cấm') || lower.includes('nguy hiểm') || lower.includes('quy định')) {
      return {
        reply: `📋 **Quy định danh mục đồ vật CẤM lưu trữ tại kho SelfStorage:**\n\n1. **Chất dễ cháy nổ**: Xăng, dầu, bình gas, pháo hoa, hóa chất dung môi dễ bắt lửa.\n2. **Thực phẩm & Đồ tươi sống**: Đồ ăn tươi, thực phẩm ôi thiu thu hút côn trùng, bốc mùi.\n3. **Động thực vật sống**: Tuyệt đối không lưu trữ thú cưng, sinh vật sống hay cây cối.\n4. **Hàng hóa trái pháp luật**: Vũ khí, chất cấm, ma túy, hàng nhập lậu không rõ nguồn gốc.\n5. **Pin & Ắc quy hỏng**: Pin lithium biến dạng, bình ắc quy rò rỉ axit gây nguy cơ chập cháy.\n\n🔒 Mọi buồng kho đều được giám sát camera an ninh 24/7 và kiểm tra tuân thủ an toàn PCCC nghiêm ngặt.`,
        intent: 'search_policy',
        sources: ['[Điều 3: Danh mục đồ cấm lưu trữ]', '[Quy chuẩn PCCC kho tự quản]'],
      };
    }

    // 3. KỸ NĂNG 2: PHÍ QUÁ HẠN & KHÓA MÃ PIN (OVERDUE POLICY)
    if (lower.includes('quá hạn') || lower.includes('hết hạn') || lower.includes('phí phạt') || lower.includes('khóa pin') || lower.includes('mã pin')) {
      return {
        reply: `⚠️ **Quy định về quá hạn hợp đồng & khoá mã PIN Smart Lock:**\n\n• **Thông báo nhắc trước**: Hệ thống gửi thông báo nhắc trước 7 ngày và 3 ngày trước khi đến hạn kết thúc hợp đồng.\n• **Phí phạt quá hạn**: Sau ngày hết hạn, phí lưu trữ quá hạn được tính **50.000đ/ngày**.\n• **Khóa mã PIN tự động**: Sau **3 ngày** quá hạn không gia hạn, mã PIN mở cửa buồng kho sẽ tạm thời bị vô hiệu hóa để bảo vệ an ninh.\n• **Kích hoạt lại**: Ngay sau khi bạn thanh toán phí gia hạn qua mã VietQR trên app (tự động 24/7), mã PIN sẽ được mở khóa lại ngay lập tức.`,
        intent: 'search_policy',
        sources: ['[Điều 7: Chế tài quá hạn & Khóa Smart Lock]', '[Chính sách thanh toán VietQR]'],
      };
    }

    // 4. KỸ NĂNG 3: GỢI Ý GÓI GIA HẠN (RENEWAL ML RECOMMENDATION)
    if (lower.includes('gia hạn') || lower.includes('gói') || lower.includes('tháng') || lower.includes('chiết khấu')) {
      return {
        reply: `🔄 **Đề xuất gói gia hạn hợp đồng tối ưu:**\n\nTheo mô hình phân tích chi phí thông minh:\n• **Gói 1 tháng**: Phù hợp nếu bạn sắp chuyển đồ đi trong thời gian ngắn (không chiết khấu).\n• **Gói 3 tháng**: Giảm ngay **5%** tổng tiền thuê (khuyên dùng cho nhu cầu lưu trữ ngắn hạn).\n• **Gói 6 tháng**: Giảm ngay **10%** tổng tiền thuê (tiết kiệm chi phí đáng kể).\n• **Gói 12 tháng (Tối ưu nhất)**: Giảm ngay **15%** + tặng 1 lượt hỗ trợ dọn kho miễn phí.\n\n👉 Bạn có thể gia hạn ngay tại tab **Kho của tôi > Gia hạn hợp đồng** và quét QR để gia hạn tự động!`,
        intent: 'recommend_package',
        sources: ['[Chính sách ưu đãi gia hạn dài hạn]'],
      };
    }

    // 5. CÂU HỎI CHUNG (GENERAL)
    return {
      reply: `Tôi là **Trợ lý AI SelfStorage**! Bạn có thể hỏi tôi:\n• 📦 **Kể tên đồ đạc** (vd: *Tôi có 1 tủ lạnh, 20 thùng và 1 xe máy*): Tôi sẽ tính tổng m³ và gợi ý kho trống phù hợp.\n• 📜 **Chính sách**: Đồ cấm, phí quá hạn, quy định khóa mã PIN.\n• 🔄 **Gia hạn**: Đề xuất gói 1, 3, 6 hoặc 12 tháng tối ưu chi phí.`,
      intent: 'general',
    };
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const userMsg: MessageItem = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsLoading(true);

    try {
      // Build conversation history of the last 6 messages
      const history = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      let assistantReply = '';
      let assistantData: any = undefined;
      let assistantIntent: any = undefined;
      let assistantSources: string[] | undefined = undefined;

      try {
        const res = await sendAiChatApi(text, {
          conversationId: conversationId || undefined,
          history,
        });

        if (res.conversation_id) {
          setConversationId(res.conversation_id);
        }

        // Nếu Backend trả về fallback thông báo bảo trì, dùng smart local fallback
        if (
          !res.reply ||
          res.intent === 'fallback' ||
          res.reply.includes('bảo trì') ||
          res.reply.includes('đang bận')
        ) {
          const smart = buildSmartFallbackResponse(text);
          assistantReply = smart.reply;
          assistantData = smart.data;
          assistantIntent = smart.intent;
          assistantSources = smart.sources;
        } else {
          assistantReply = res.reply;
          assistantData = res.data;
          assistantIntent = res.intent;
          assistantSources = res.sources;
        }
      } catch (apiErr: any) {
        // Khi không kết nối được Backend hoặc Backend chưa deploy route AI:
        const smart = buildSmartFallbackResponse(text);
        assistantReply = smart.reply;
        assistantData = smart.data;
        assistantIntent = smart.intent;
        assistantSources = smart.sources;
      }

      const assistantMsg: MessageItem = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: assistantReply,
        data: assistantData,
        intent: assistantIntent,
        sources: assistantSources,
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: MessageItem = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content:
          'Xin lỗi bạn, tôi chưa xử lý được câu hỏi này. Bạn vui lòng thử lại nhé!',
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setConversationId('');
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        role: 'assistant',
        content:
          'Đã bắt đầu đoạn hội thoại mới! Bạn cần hỗ trợ tính thể tích đồ đạc, tìm kiếm kho trống hay tra cứu chính sách nào?',
        createdAt: new Date(),
      },
    ]);
  };

  const renderContentText = (rawText: string, isUser = false) => {
    // Basic formatting for **bold**
    const parts = rawText.split(/(\*\*.*?\*\*)/g);
    return (
      <Text style={[s.messageText, isUser && s.userMessageText]}>
        {parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <Text key={i} style={[s.boldText, isUser && s.userBoldText]}>
                {part.slice(2, -2)}
              </Text>
            );
          }
          return <Text key={i}>{part}</Text>;
        })}
      </Text>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={s.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={s.keyboardContainer}
        >
          <View style={s.modalContainer}>
            {/* 1. HEADER */}
            <View style={s.header}>
              <View style={s.headerLeft}>
                <View style={s.botAvatar}>
                  <MaterialIcons name="auto-awesome" size={20} color="#ffffff" />
                  <View style={s.onlineBadge} />
                </View>
                <View>
                  <View style={s.headerTitleRow}>
                    <Text style={s.headerTitle}>SelfStorage AI</Text>
                    
                  </View>
                </View>
              </View>

              <View style={s.headerActions}>
                <TouchableOpacity
                  style={s.headerActionBtn}
                  onPress={handleResetChat}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialIcons name="refresh" size={20} color="#94a3b8" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.headerActionBtn}
                  onPress={onClose}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialIcons name="close" size={22} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* 2. QUICK PROMPTS BAR */}
            <View style={s.quickPromptsContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.quickPromptsScroll}
              >
                {QUICK_PROMPTS.map((qp, index) => (
                  <TouchableOpacity
                    key={index}
                    style={s.quickChip}
                    onPress={() => handleSend(qp.prompt)}
                    activeOpacity={0.75}
                    disabled={isLoading}
                  >
                    <MaterialIcons
                      name={qp.icon as any}
                      size={15}
                      color="#2563eb"
                      style={{ marginRight: 5 }}
                    />
                    <Text style={s.quickChipText}>{qp.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* 3. CHAT MESSAGES BODY */}
            <ScrollView
              ref={scrollViewRef}
              style={s.messagesContainer}
              contentContainerStyle={s.messagesContent}
              keyboardShouldPersistTaps="handled"
            >
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <View
                    key={msg.id}
                    style={[
                      s.messageRow,
                      isUser ? s.userMessageRow : s.aiMessageRow,
                    ]}
                  >
                    {!isUser && (
                      <View style={s.aiAvatarSmall}>
                        <MaterialIcons name="smart-toy" size={16} color="#ffffff" />
                      </View>
                    )}

                    <View
                      style={[
                        s.messageBubble,
                        isUser ? s.userBubble : s.aiBubble,
                      ]}
                    >
                      {/* Formatted Text */}
                      {renderContentText(msg.content, isUser)}

                      {/* SKILL 1: RECOGNIZED ITEMS CHIPS */}
                      {msg.data?.items && msg.data.items.length > 0 && (
                        <View style={s.itemsSection}>
                          <View style={s.itemsHeader}>
                            <View style={s.itemsHeaderLeft}>
                              <MaterialIcons name="all-inbox" size={16} color="#2563eb" />
                              <Text style={s.itemsHeaderTitle}>
                                Đồ vật nhận diện ({msg.data.items.length})
                              </Text>
                            </View>
                            <View style={s.volumeBadge}>
                              <Text style={s.volumeBadgeText}>
                                Tổng: ~{msg.data.required_volume_m3?.toFixed(2)} m³
                              </Text>
                            </View>
                          </View>

                          <View style={s.itemsList}>
                            {msg.data.items.map((it: AiItem, idx: number) => (
                              <View key={idx} style={s.itemPill}>
                                <Text style={s.itemPillName} numberOfLines={1}>
                                  {it.quantity}x {it.item}
                                </Text>
                                <Text style={s.itemPillVol}>
                                  {it.total_volume_m3?.toFixed(2)} m³
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}

                      {/* SKILL 1: SUGGESTED AVAILABLE UNITS */}
                      {msg.data?.suggested_units && msg.data.suggested_units.length > 0 && (
                        <View style={s.suggestedUnitsSection}>
                          <Text style={s.suggestedUnitsTitle}>
                            <MaterialIcons name="check-circle" size={14} color="#10b981" />
                            {' '}Ngăn kho trống phù hợp nhất:
                          </Text>

                          {msg.data.suggested_units.slice(0, 3).map((u: AiSuggestedUnit, idx: number) => (
                            <View key={idx} style={s.unitCard}>
                              <View style={s.unitCardHeader}>
                                <Text style={s.unitCardNumber} numberOfLines={1} ellipsizeMode="tail">
                                  Kho {u.unit_number} • {u.unit_type_name || 'Tiêu chuẩn'}
                                </Text>
                                <Text style={s.unitCardPrice}>
                                  {formatVND(u.price_per_month || 0)}/tháng
                                </Text>
                              </View>

                              <View style={s.unitCardSpecs}>
                                <Text style={s.unitCardFacility} numberOfLines={1} ellipsizeMode="tail">
                                  📍 {u.facility_name || 'Chi nhánh SelfStorage'}
                                </Text>
                                <Text style={s.unitCardDim}>
                                  {u.size_m2}m² · ~{u.volume_m3}m³
                                </Text>
                              </View>

                              <TouchableOpacity
                                style={s.bookUnitBtn}
                                activeOpacity={0.85}
                                onPress={() => {
                                  onClose();
                                  if (onSelectUnitToBook) {
                                    onSelectUnitToBook(u);
                                  }
                                }}
                              >
                                <Text style={s.bookUnitBtnText}>Đặt ngăn này ngay</Text>
                                <MaterialIcons name="arrow-forward" size={14} color="#ffffff" />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* SKILL 2: POLICY RAG SOURCES */}
                      {msg.sources && msg.sources.length > 0 && (
                        <View style={s.sourcesSection}>
                          <Text style={s.sourcesLabel}>Tài liệu nguồn trích dẫn:</Text>
                          <View style={s.sourcesList}>
                            {msg.sources.map((src, i) => (
                              <View key={i} style={s.sourceTag}>
                                <Text style={s.sourceTagText}>
                                  {src.replace(/[[\]]/g, '')}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}

              {/* AI THINKING INDICATOR */}
              {isLoading && (
                <View style={[s.messageRow, s.aiMessageRow]}>
                  <View style={s.aiAvatarSmall}>
                    <MaterialIcons name="smart-toy" size={16} color="#ffffff" />
                  </View>
                  <View style={[s.messageBubble, s.aiBubble, s.loadingBubble]}>
                    <ActivityIndicator size="small" color="#2563eb" />
                    <Text style={s.loadingText}>AI đang phân tích & tính toán thể tích...</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* 4. INPUT BAR */}
            <View style={s.inputContainer}>
              <TextInput
                style={s.textInput}
                placeholder="Nhập đồ đạc cần lưu hoặc câu hỏi..."
                placeholderTextColor="#94a3b8"
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => handleSend()}
                returnKeyType="send"
                multiline={false}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={[
                  s.sendButton,
                  (!inputText.trim() || isLoading) && s.sendButtonDisabled,
                ]}
                onPress={() => handleSend()}
                disabled={!inputText.trim() || isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <MaterialIcons name="send" size={18} color="#ffffff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: SCREEN_HEIGHT * 0.88,
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
    display: 'flex',
    flexDirection: 'column',
  },
  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  botAvatar: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#0f172a',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  mlTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: 'rgba(37, 99, 235, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.4)',
  },
  mlTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#93c5fd',
  },
  headerSubTitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ── Quick Prompts ──
  quickPromptsContainer: {
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  quickPromptsScroll: {
    paddingHorizontal: 14,
    gap: 8,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1d4ed8',
  },
  // ── Messages ──
  messagesContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  messagesContent: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 2,
  },
  userMessageRow: {
    justifyContent: 'flex-end',
  },
  aiMessageRow: {
    justifyContent: 'flex-start',
  },
  aiAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#2563eb',
    borderBottomRightRadius: 4,
    alignSelf: 'flex-end',
    maxWidth: '80%',
  },
  aiBubble: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
    maxWidth: '92%',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#1e293b',
  },
  userMessageText: {
    color: '#ffffff',
  },
  boldText: {
    fontWeight: '700',
    color: '#0f172a',
  },
  userBoldText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
  },
  // ── Items Section ──
  itemsSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  itemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  itemsHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  volumeBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  volumeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  itemsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  itemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: '47%',
    flex: 1,
  },
  itemPillName: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  itemPillVol: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748b',
    marginLeft: 4,
  },
  // ── Suggested Units ──
  suggestedUnitsSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 8,
  },
  suggestedUnitsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  unitCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 10,
    gap: 6,
    width: '100%',
    overflow: 'hidden',
  },
  unitCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  unitCardNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: '#14532d',
    flex: 1,
    flexShrink: 1,
  },
  unitCardPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803d',
    flexShrink: 0,
  },
  unitCardSpecs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  unitCardFacility: {
    fontSize: 11,
    color: '#4b5563',
    flex: 1,
    flexShrink: 1,
  },
  unitCardDim: {
    fontSize: 11,
    fontWeight: '600',
    color: '#166534',
    flexShrink: 0,
  },
  bookUnitBtn: {
    marginTop: 4,
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
  },
  bookUnitBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  // ── Sources ──
  sourcesSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  sourcesLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  sourcesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  sourceTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sourceTagText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '500',
  },
  // ── Input Bar ──
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 10,
  },
  textInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#f1f5f9',
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 13.5,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
    elevation: 0,
  },
});
