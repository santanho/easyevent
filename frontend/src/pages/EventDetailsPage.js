import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import { 
  Typography, 
  Button, 
  Spin, 
  Alert,
  List,
  Avatar,
  Form,
  Input,
  message,
  Divider, 
  Collapse, 
  Progress, 
  Radio, 
  Checkbox, 
  Tooltip,
  Space,
  Modal,
  Popconfirm,
  Empty,
  Card,
  Row,
  Col,
  Badge,
  DatePicker,
  Tabs // ( "หัวใจ" (Heart) ... "ของ" (Of) ... "Layout" (Layout))
} from 'antd';
import { 
  ArrowLeftOutlined,
  PlusOutlined, 
  DeleteOutlined, 
  BarChartOutlined,
  ReloadOutlined,
  CheckSquareOutlined, // ( "ไอคอน" (Icon) ... "สำหรับ" (For) ... "Tasks")
  CalendarOutlined
} from '@ant-design/icons';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

dayjs.extend(localizedFormat);

const { Title, Paragraph, Text } = Typography;
const { Panel } = Collapse;


/* -----------------------
 * "Component "ลูก" (Child) ... 1: "CommentItem" (กล่อง "คอมเมนต์")
 * ----------------------- */
const CommentItem = ({ comment, eventId, onCommentAdded, onReplyPosted }) => {
  const [replies, setReplies] = useState([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyForm] = Form.useForm();
  const [replyCount, setReplyCount] = useState(comment.replyCount || 0);
  
  // (เรา "อาจจะ" (Might) ... "ต้องการ" (Need) ... "State" (State) ... "นับ" (Count) ... "Reply" (Replies) ... "แยก" (Separately))
  // const [replyCount, setReplyCount] = useState(comment.replyCount ?? 0); 

  const loadReplies = async () => {
    if (showReplies) {
      setShowReplies(false); 
      return;
    }
    setLoadingReplies(true);
    try {
      const { data } = await api.get(`/api/comments/replies/${comment._id}`);
      setReplies(data || []);
      setShowReplies(true); 
    } catch (error) {
      message.error('Failed to load replies.');
    } finally {
      setLoadingReplies(false);
    }
  };

  const onReplySubmit = async (values) => {
    setReplyLoading(true);
    try {
      const { data: newReply } = await api.post(`/api/comments/${eventId}`, {
        text: values.text,
        parentCommentId: comment._id 
      });
      setReplies(prevReplies => [...prevReplies, newReply]);
      setReplyCount(prev => prev + 1);
      replyForm.resetFields();
      setShowReplyForm(false); 
      if (onCommentAdded) onCommentAdded(newReply); // ( "ตะโกน" (Shout) ... "บอก "แม่"" (Tell "Parent"))
      message.success('Reply posted');
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to post reply.');
    } finally {
      setReplyLoading(false);
    }
  };

  const actions = [
    <span key="reply" onClick={() => setShowReplyForm(s => !s)}>{showReplyForm ? 'Cancel' : 'Reply'}</span>,
    <span key="view" onClick={loadReplies}>
      {loadingReplies ? 'Loading...' : (showReplies ? `Hide Replies (${replies.length})` : `View Replies (${replies.length})`)}
    </span>
  ];

  return (
    <Card 
      size="small" 
      style={{ 
        width: '100%', 
        marginTop: 16, 
        backgroundColor: comment.parentComment ? '#fafafa' : '#fff' // ( "Reply" (Reply) ... "สี "เทา"" (Grey "Color"))
      }}
    >
      <List.Item.Meta
        avatar={
          <Avatar 
            style={{ backgroundColor: comment.author ? comment.author.profileColor : '#888' }}
          >
            {comment.author ? (comment.author.name ? comment.author.name[0].toUpperCase() : 'U') : 'D'}
          </Avatar>
        }
        title={<Text strong>{comment.author ? comment.author.name : 'Deleted User'}</Text>}
        description={
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {dayjs(comment.createdAt).format('DD/MM/YYYY h:mm A')}
          </Text>
        }
      />
      <Paragraph style={{ marginTop: 12, marginLeft: 52 }}>{comment.text}</Paragraph>
      <Space size="middle" style={{ marginLeft: 52 }}>
        {actions.map((action, index) => (
          <Text key={index} type="secondary" style={{ fontSize: 12, cursor: 'pointer', userSelect: 'none' }}>
            {action}
          </Text>
        ))}
      </Space>

      {showReplyForm && (
        <Form form={replyForm} onFinish={onReplySubmit} style={{ marginTop: 8, marginLeft: 52 }}>
          <Form.Item name="text" rules={[{ required: true }]} style={{ marginBottom: 8 }}>
            <Input.TextArea rows={2} placeholder="Write a reply..." />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button htmlType="submit" loading={replyLoading} type="primary" size="small">Post Reply</Button>
          </Form.Item>
        </Form>
      )}
      
      {showReplies && (
        <div style={{ marginLeft: 32, marginTop: 16 }}>
          {replies.length === 0 && (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No replies yet" />
          )}
          {replies.length > 0 && (
            <List
              dataSource={replies}
              renderItem={(reply) => (
                // ( "เรียก" (Call) ... "ตัวมันเอง" (Itself) ... "ซ้ำ" (Recursively) ... (แบบ "สะอาด" (Clean)))
                <CommentItem comment={reply} eventId={eventId} onCommentAdded={onCommentAdded} />
              )}
            />
          )}
        </div>
      )}
    </Card>
  );
};

/* -----------------------
 * "Component "ลูก" (Child) ... 2: "PollOption" (ตัวเลือก "โพล")
 * ----------------------- */
const PollOption = ({ option, user, totalVotes, canInteract, onVote, canDelete, onDeleteOption }) => {
  const percentage = totalVotes === 0 ? 0 : (option.votes.length / totalVotes) * 100;
  // ( "ยาม" (Guard) ... "ที่ "ปลอดภัย"" (Safe "Guard"))
  const userHasVoted = user && user._id && option.votes.some(v => v._id === user._id);

  return (
    <div style={{ padding: '10px 0', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      {/* ( "ส่วน" (Part) ... "ข้อความ" (Text) + "แถบ" (Bar)) */}
      <div style={{ flex: 1, marginRight: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong>{option.text}</Text>
            {canDelete && (
                <Popconfirm title="Delete option?" onConfirm={onDeleteOption} okText="Yes" cancelText="No">
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} style={{ opacity: 0.6 }} />
                </Popconfirm>
            )}
        </div>
        <div style={{ marginTop: 8 }}>
          <Progress percent={Number(percentage.toFixed(1))} showInfo={false} size="small" />
        </div>
      </div>

      {/* ( "ส่วน" (Part) ... "ปุ่ม" (Button) + "คนโหวต" (Voters)) */}
      <Space size="small" align="center">
        <Tooltip
          title={
            <Avatar.Group maxCount={10} size="small">
              {option.votes.map(voter => (
                <Avatar 
                  key={voter._id} 
                  style={{ backgroundColor: voter.profileColor || '#87d068' }}
                >
                  {voter.name ? voter.name[0].toUpperCase() : 'V'}
                </Avatar>
              ))}
            </Avatar.Group>
          }
        >
          <Text type="secondary" style={{ minWidth: 48, textAlign: 'right' }}>{option.votes.length} votes</Text>
        </Tooltip>

        <Button
          size="small"
          type={userHasVoted ? 'primary' : 'default'}
          onClick={() => {
            if (!canInteract) {
              message.error('You must be an accepted guest to vote.');
              return;
            }
            onVote(option._id);
          }}
          disabled={!canInteract}
        >
          {userHasVoted ? 'Voted' : 'Vote'}
        </Button>
      </Space>
    </div>
  );
};


/* -----------------------
 * "Component "ลูก" (Child) ... 3: "PollCard" (การ์ด "โพล")
 * ----------------------- */
const PollCard = ({ poll, index, user, event, onAddOption, onReset, onDelete, onVote, onDeleteOption }) => {
  const totalVotes = poll.options.reduce((acc, opt) => acc + (opt.votes?.length || 0), 0);

  // ( "ยาม" (Guards) ... "ที่ "ปลอดภัย"" (Safe "Guards") ... "ทั้งหมด" (All))
  const currentUserId = user ? user._id.toString() : null; 
  const isPollAuthor = poll.author && (poll.author._id.toString() === currentUserId);
  const isEventOwner = event.owner && (event.owner._id.toString() === currentUserId);
  const canDeletePoll = isEventOwner || isPollAuthor;
  
  const isAcceptedGuest = user && event.guests.find(g => 
    g.email === user.email.toLowerCase() && g.status === 'accepted'
  );
  const canInteractWithPoll = isEventOwner || isAcceptedGuest;

  return (
    <Card style={{ marginBottom: 16, borderRadius: 12 }} bodyStyle={{ padding: '16px 20px' }}>
      {/* ( "Header" (Header) ... (Title + Buttons)) */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 8 }}>
        <Col flex="auto">
          <Text strong style={{ fontSize: 16 }}>{index + 1}. {poll.question}</Text>
          <div style={{ marginTop: 6 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Created by {poll.author ? poll.author.name : 'Deleted User'} · {totalVotes} votes</Text>
          </div>
        </Col>

        <Col>
          <Space>
            {/* ( "ปุ่ม "Add"" (Add "Button") ... ( "ทุก" (Everyone) ... "คน" (People) ... "ที่ "มีสิทธิ์"" (Authorized) ... "เห็น" (See))) */}
            {canInteractWithPoll && (
              <Button type="text" icon={<PlusOutlined />} onClick={() => onAddOption(poll._id)}>Add Option</Button>
            )}
            
            {/* ( "ปุ่ม "Reset"" (Reset "Button") ... ( "เฉพาะ" (Only) ... "คนสร้าง" (Author))) */}
            {isPollAuthor && (
              <Button type="dashed" danger icon={<ReloadOutlined />} onClick={() => onReset(poll._id)}>
                Reset
              </Button>
            )}
            
            {/* ( "ปุ่ม "Delete"" (Delete "Button") ... ( "คนสร้าง" (Author) ... "หรือ" (OR) ... "เจ้าของ" (Owner))) */}
            {canDeletePoll && (
              <Popconfirm title="Delete this poll?" description="This action cannot be undone." onConfirm={() => onDelete(poll._id)} okText="Yes" cancelText="No">
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            )}
          </Space>
        </Col>
      </Row>

      <Divider style={{ margin: '12px 0' }} />

      {/* ( "Body" (Body) ... ( "ตัวเลือก" (Options))) */}
      <div>
        {poll.options.map(opt => (
          <PollOption key={opt._id} option={opt} user={user} totalVotes={totalVotes} canInteract={canInteractWithPoll} onVote={onVote} canDelete={canDeletePoll} 
            onDeleteOption={() => onDeleteOption(poll._id, opt._id)}/>
        ))}
      </div>
    </Card>
  );
};


/* -----------------------
 * "Component "แม่"" (PARENT "Component") ... (EventDetailsPage)
 * ----------------------- */
const EventDetailsPage = () => {
  const { id } = useParams(); 
  const { user } = useAuth();
  
  // (States ... "Event", "Loading", "Error")
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // (States ... "Comments")
  const [comments, setComments] = useState([]); 
  const [commentLoading, setCommentLoading] = useState(false); 
  const [form] = Form.useForm(); // (ฟอร์ม "แม่" (Parent))
  
  // (States ... "Polls")
  const [polls, setPolls] = useState([]);
  const [pollForm] = Form.useForm();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [newOptionText, setNewOptionText] = useState('');
  const [currentPollId, setCurrentPollId] = useState(null);
  
  // (States ... "Tasks")
  const [todos, setTodos] = useState([]); 
  const [todoLoading, setTodoLoading] = useState(false);
  const [todoForm] = Form.useForm(); 

// (States ... "Sub-Events")
  const [subEvents, setSubEvents] = useState([]);
  const [isSubEventModalOpen, setIsSubEventModalOpen] = useState(false);
  const [subEventForm] = Form.useForm();

  // (useEffect ... "ดึง" (Fetch) ... "ทุกอย่าง" (Everything) ... (4 "อย่าง" (Things)))
  useEffect(() => {
    const fetchEventData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [eventRes, commentsRes, pollsRes, todosRes, subEventsRes] = await Promise.all([
          api.get(`/api/events/${id}`),
          api.get(`/api/comments/${id}`), 
          api.get(`/api/polls/${id}`), 
          api.get(`/api/todos/${id}`),
          api.get(`/api/events/${id}/sub-events`)
        ]);

        setEvent(eventRes.data);
        setComments(commentsRes.data || []); 
        setPolls(pollsRes.data || []); 
        setTodos(todosRes.data || []); 
        setSubEvents(subEventsRes.data || []);

        console.log("guests >>>", eventRes.data.guests);
      } catch (err) {
        setError('Failed to load event data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEventData();
  }, [id]);
  
  // (ฟังก์ชัน "Refresh" (Refresh) ... "Comments" (Comments))
  const refreshComments = async () => {
    try {
      const commentsRes = await api.get(`/api/comments/${id}`);
      setComments(commentsRes.data || []);
    } catch (err) {
      console.log('Failed to refresh comments, but continuing');
    }
  }

  // ( "Handler" (Handler) ... "Comment "แม่"" (Parent "Comment"))
  const onCommentSubmit = async (values) => {
    setCommentLoading(true);
    try {
      const { data: newComment } = await api.post(`/api/comments/${id}`, {
        text: values.text,
        parentCommentId: null 
      });
      setComments(prevComments => [...prevComments, newComment]);
      form.resetFields(); 
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to post comment.');
    } finally {
      setCommentLoading(false);
    }
  };

  // ( "Handlers" (Handlers) ... "Polls" (โพล))
  const onPollSubmit = async (values) => {
    const validOptions = (values.options || []).filter(opt => opt && opt.trim() !== '');
    if (validOptions.length < 2) {
      message.error('Polls need at least 2 valid options.');
      return;
    }
    try {
      const { data: newPoll } = await api.post(`/api/polls/${id}`, {
        question: values.question,
        options: validOptions
      });
      setPolls(prev => [...prev, newPoll]);
      pollForm.resetFields(); 
      message.success('Poll created successfully!');
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to create poll.');
    }
  };
  const handleVote = async (optionId) => {
    try {
      const { data: updatedPoll } = await api.put(`/api/polls/vote/${optionId}`);
      setPolls(prev => prev.map(p => p._id === updatedPoll._id ? updatedPoll : p));
      message.success('Vote cast!');
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to vote.');
    }
  };
  const handleDeletePoll = async (pollId) => {
    try {
      await api.delete(`/api/polls/${pollId}`);
      setPolls(prev => prev.filter(p => p._id !== pollId));
      message.success('Poll deleted successfully!');
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to delete poll.');
    }
  };
  const showResetPollModal = (pollId) => {
    setCurrentPollId(pollId);
    setIsResetModalOpen(true);
  };
  const handleConfirmReset = async () => {
    try {
      const { data: updatedPoll } = await api.put(`/api/polls/${currentPollId}/reset`);
      setPolls(prev => prev.map(p => p._id === updatedPoll._id ? updatedPoll : p));
      message.success('Poll votes have been reset!');
      setIsResetModalOpen(false); 
      setCurrentPollId(null);
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to reset poll.');
      setIsResetModalOpen(false); 
    }
  };
  const showAddOptionModal = (pollId) => {
    setCurrentPollId(pollId);
    setIsAddModalOpen(true);
  };
  const handleAddOption = async () => {
    if (!newOptionText.trim()) {
      message.error('Option text cannot be empty');
      return;
    }
    try {
      const { data: updatedPoll } = await api.post(
        `/api/polls/${currentPollId}/add-option`,
        { optionText: newOptionText }
      );
      setPolls((prevPolls) =>
        prevPolls.map((poll) =>
          poll._id === updatedPoll._id ? updatedPoll : poll
        )
      );
      message.success('Option added successfully!');
      setIsAddModalOpen(false);
      setNewOptionText('');
    } catch (error) {
      console.error(error);
      message.error(error.response?.data?.message || 'Failed to add option');
    }
  };

  // ( "Handlers" (Handlers) ... "Tasks" (งานย่อย))
  const onTodoSubmit = async (values) => {
    setTodoLoading(true);
    try {
      const { data: newTodo } = await api.post(`/api/todos/${id}`, {
        text: values.text
      });
      setTodos(prev => [...prev, newTodo]);
      todoForm.resetFields();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to create task.');
    } finally {
      setTodoLoading(false);
    }
  };
  const handleTodoToggle = async (todoId) => {
    try {
      const { data: updatedTodo } = await api.put(`/api/todos/${todoId}/toggle`);
      setTodos(prev => 
        prev.map(todo => todo._id === updatedTodo._id ? updatedTodo : todo)
      );
    } catch (error) {
      message.error('Failed to update task status.');
    }
  };
  const handleTodoDelete = async (todoId) => {
    try {
      await api.delete(`/api/todos/${todoId}`);
      setTodos(prev => prev.filter(todo => todo._id !== todoId));
      message.success('Task removed');
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to delete task.');
    }
  };

  const onSubEventSubmit = async (values) => {
    try {
      // ⭐️ 1. ดึงรายชื่อแขก (Emails) จากกิจกรรมหลัก (Event แม่) มาเตรียมไว้
      // (ถ้า event.guests มีค่า ก็ map เอาเฉพาะ email ออกมา)
      const inheritedGuests = event?.guests ? event.guests.map(g => g.email) : [];

      const { data: newEvent } = await api.post('/api/events', {
        title: values.title,
        description: values.description, // ⭐️ 2. ส่งรายละเอียดที่กรอกมา
        startTime: values.dateRange[0].toDate(),
        endTime: values.dateRange[1].toDate(),
        guests: inheritedGuests, // ⭐️ 3. ยัดแขกจากแม่ใส่เข้าไปให้ลูกเลย!
        parentEventId: id, 
        color: '#722ed1' 
      });
      
      setSubEvents(prev => [...prev, newEvent]);
      setIsSubEventModalOpen(false);
      subEventForm.resetFields();
      message.success('Sub-event created with guests!');
    } catch (error) {
      message.error('Failed to create sub-event');
    }
  };

  const handleDeleteSubEvent = async (subEventId) => {
    try {
      // เรียก API ลบ Event ตามปกติ (เพราะ Sub-event ก็คือ Event หนึ่ง)
      await api.delete(`/api/events/${subEventId}`);
      
      // อัปเดตหน้าจอ: เอาอันที่ลบออกไปจากรายการ
      setSubEvents(prev => prev.filter(item => item._id !== subEventId));
      
      message.success('Sub-event deleted successfully');
    } catch (error) {
      message.error('Failed to delete sub-event');
    }
  };

  const handleDeleteOption = async (pollId, optionId) => {
    try {
      const { data: updatedPoll } = await api.delete(`/api/polls/option/${optionId}`);
      
      setPolls(prev => prev.map(poll => 
        poll._id === updatedPoll._id ? updatedPoll : poll
      ));
      message.success('Option deleted');
    } catch (error) {
      message.error('Failed to delete option');
    }
  };

  // ( ... โค้ด 'if (loading)...', 'if (error)...', 'if (!event)...' ... "เหมือนเดิม" (Same))
  if (loading) { return <div style={{ textAlign: 'center', margin: 50 }}><Spin size="large" /></div>; }
  if (error) { return <Alert message="Error" description={error} type="error" showIcon />; }
  if (!event) { return <Alert message="Event not found" type="warning" showIcon />; }

  // --- ⭐️ (5. "อัปเกรด" (Upgrade) ... "return (JSX)" ... (V5 - The "Tabs" Layout)) ---
  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto' }}>
      {/* (1. "Header "หลัก"" (Main "Header")) */}
      <Button type="text" icon={<ArrowLeftOutlined />} style={{ marginBottom: 12 }}>
        <Link to="/Easyevent/list">Back to List</Link>
      </Button>

      <Card style={{ borderRadius: 14, marginBottom: 20 }} bodyStyle={{ padding: '20px 24px' }}>
        <Row gutter={16} align="middle">
          <Col>
            <Avatar size={72} style={{ backgroundColor: event.owner?.profileColor || '#334155' }}>
              {event.owner?.name ? event.owner.name[0].toUpperCase() : 'E'}
            </Avatar>
          </Col>
          <Col flex="auto">
            <Title level={2} style={{ marginBottom: 0 }}>{event.title}</Title>
            
            <Text type="secondary">Organized by {event.owner?.name}</Text>
          </Col>
        </Row>
      </Card>

      {/* --- (2. "แท็บ" (Tabs) ... "หลัก" (Main)) --- */}
      <Tabs defaultActiveKey="1" type="card">

        {/* --- (แท็บ 1: "รายละเอียด" (Details)) --- */}
        <Tabs.TabPane tab="Details" key="1">
  <Card 
    bordered={false} 
    style={{ borderRadius: 16, padding: 16, background: "#fafafa" }}
  >

    <Row gutter={[16, 24]}>
      
      {/* ⭐ Description */}
      <Col span={24}>
        <Title level={5} style={{ marginBottom: 8 }}>Description</Title>
        <Card 
          style={{
            borderRadius: 12,
            background: "#ffffff",
            padding: 12
          }}
          bodyStyle={{ padding: 12 }}
        >
          <Paragraph style={{ margin: 0 }}>
            {event.description || <i>No description provided.</i>}
          </Paragraph>
        </Card>
      </Col>

      {/* ⭐ Time */}
      <Col span={24}>
        <Title level={5} style={{ marginBottom: 8 }}>Event Time</Title>
        <Card 
          style={{
            borderRadius: 12,
            background: "#ffffff",
            padding: 12
          }}
          bodyStyle={{ padding: 12 }}
        >
          <Space direction="vertical" size={4}>
            <Text><b>From:</b> {dayjs(event.startTime).format("LLL")}</Text>
            <Text><b>To:</b> {dayjs(event.endTime).format("LLL")}</Text>
          </Space>
        </Card>
      </Col>

      {/* ⭐ Owner Block */}
      <Col span={24}>
        <Title level={5} style={{ marginBottom: 12 }}>Event Owner</Title>

        <Card 
          style={{ 
            borderRadius: 12,
            background: "#ffffff",
            padding: 12
          }}
          bodyStyle={{ padding: 12 }}
        >
          <Space align="center">
            <Avatar 
              size={56}
              style={{
                backgroundColor: event.owner?.profileColor || '#1890ff',
                fontSize: 22
              }}
            >
              {event.owner?.name?.[0]?.toUpperCase() || "O"}
            </Avatar>

            <div>
              <Text strong style={{ fontSize: 16 }}>{event.owner?.name}</Text><br/>
              <Text type="secondary">{event.owner?.email}</Text>
            </div>
          </Space>
        </Card>
      </Col>

      {/* ⭐ Guests Block */}
      <Col span={24}>
        <Title level={5} style={{ margin: "12px 0" }}>Guests ({event.guests.length})</Title>

        {event.guests.length === 0 && (
          <Text type="secondary">No guests added.</Text>
        )}

        <List
          itemLayout="horizontal"
          dataSource={event.guests}
          renderItem={(guest) => {
            const guestUser = guest.user
            const displayName = guestUser ? guestUser.name : guest.email;
            const displayColor = guestUser ? (guestUser.profileColor || '#1890ff') : '#bfbfbf';
            const firstLetter = displayName[0].toUpperCase();

            return (
              <List.Item
                style={{
                  padding: "12px 0",
                  borderBottom: "1px solid #f0f0f0"
                }}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar 
                      size={48}
                      style={{
                        backgroundColor: displayColor,
                        opacity: guest.status === 'rejected' ? 0.3 : 1,
                        border: guest.status === 'accepted' ? '2px solid #52c41a' : 'none' // (แถม: (Bonus) ... "ขอบเขียว" (Green border) ... ถ้า "Accept")
                      }}
                    >
                      {firstLetter}
                    </Avatar>
                  }
                  title={
                    <Space>
                      <Text strong style={{ fontSize: 15 }}>
                        {displayName}
                      </Text>
                      <Badge 
                        status={
                          guest.status === "accepted"
                            ? "success"
                            : guest.status === "pending"
                            ? "processing"
                            : "error"
                        }
                        text={guest.status.charAt(0).toUpperCase() + guest.status.slice(1)}
                      />
                    </Space>
                  }
                  description={
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      {guest.email}
                    </Text>
                  }
                />
              </List.Item>
            );
          }}
        />
      </Col>

    </Row>

  </Card>
</Tabs.TabPane>
        
        {/* --- (แท็บ 2: "โพล" (Polls)) --- */}
        {event.eventType === 'project' && (
        <Tabs.TabPane tab={`Polls (${polls.length})`} key="2">
          {polls.length === 0 ? (
            <Empty description="No polls yet — create one!" style={{ marginTop: 16 }} />
          ) : (
            polls.map((p, idx) => (
              <PollCard
                key={p._id}
                poll={p}
                index={idx}
                user={user}
                event={event}
                onAddOption={showAddOptionModal}
                onReset={showResetPollModal}
                onDelete={handleDeletePoll}
                onVote={handleVote}
                onDeleteOption={handleDeleteOption}
              />
            ))
          )}
          <Divider />
          <Collapse ghost>
            <Panel header={<Text strong><BarChartOutlined /> Create New Poll</Text>} key="1">
              <Form form={pollForm} onFinish={onPollSubmit} layout="vertical">
                <Form.Item name="question" label="Question" rules={[{ required: true, message: 'Please enter a question' }]}>
                  <Input placeholder="e.g., Where should we go for dinner?" />
                </Form.Item>
                <Form.List name="options" initialValue={['', '']}>
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map(({ key, name, ...restField }, idx) => (
                        <Form.Item
                          key={key}
                          {...restField}
                          name={name}
                          label={idx === 0 ? 'Options (min 2)' : null}
                          rules={[{ required: true, message: 'Option text is required' }]}
                        >
                          <Input placeholder={`Option ${idx + 1}`} addonAfter={fields.length > 2 ? <DeleteOutlined onClick={() => remove(name)} /> : null} />
                        </Form.Item>
                      ))}
                      <Form.Item>
                        <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} block>Add Option</Button>
                      </Form.Item>
                    </>
                  )}
                </Form.List>
                <Form.Item>
                  <Button type="primary" htmlType="submit">Create Poll</Button>
                </Form.Item>
              </Form>
            </Panel>
          </Collapse>
        </Tabs.TabPane>
        )}

        {/* --- (แท็บ 3: "Tasks") --- */}
        <Tabs.TabPane 
          tab={
            <Space>
              <CheckSquareOutlined />
              Tasks <Badge count={todos.filter(t => !t.isCompleted).length} size="small" />
            </Space>
          } 
          key="3"
        >
          <Form form={todoForm} onFinish={onTodoSubmit} layout="inline" style={{ marginBottom: 24 }}>
            <Form.Item name="text" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="e.g., Book flight tickets..." />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={todoLoading}>Add Task</Button>
            </Form.Item>
          </Form>
          <Divider style={{ margin: '0 0 24px 0' }} />
          
          <Title level={5}>Pending Tasks</Title>
          <List
            dataSource={todos.filter(t => !t.isCompleted)} 
            renderItem={(todo) => (
              <List.Item
                actions={[
                  <Popconfirm title="Delete this task?" onConfirm={() => handleTodoDelete(todo._id)}>
                    <Button type="text" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                ]}
              >
                <Checkbox 
                  checked={todo.isCompleted} 
                  onChange={() => handleTodoToggle(todo._id)}
                  style={{ marginRight: 12 }}
                />
                <List.Item.Meta
                  title={todo.text}
                  description={`Added by ${todo.author ? todo.author.name : '...'} on ${dayjs(todo.createdAt).format('DD MMM')}`}
                />
              </List.Item>
            )}
          />
          
          {todos.filter(t => t.isCompleted).length > 0 && (
            <>
              <Title level={5} style={{ marginTop: 24 }}>Completed Tasks</Title>
              <List
                dataSource={todos.filter(t => t.isCompleted)} 
                renderItem={(todo) => (
                  <List.Item>
                    <Checkbox 
                      checked={todo.isCompleted} 
                      onChange={() => handleTodoToggle(todo._id)}
                      style={{ marginRight: 12 }}
                    />
                    <List.Item.Meta
                      title={<Text delete>{todo.text}</Text>} 
                      description={`Completed on ${dayjs(todo.updatedAt).format('DD MMM')}`}
                    />
                  </List.Item>
                )}
              />
            </>
          )}
        </Tabs.TabPane>


        {/* --- (แท็บ 4: "กำหนดการเพิ่มเติม" (Itinerary)) --- */}
        {event.eventType === 'project' && (
        <Tabs.TabPane 
          tab={<Space><CalendarOutlined /> Itinerary ({subEvents.length})</Space>} 
          key="itinerary"
        >
          <Button 
            type="dashed" 
            icon={<PlusOutlined />} 
            block 
            onClick={() => setIsSubEventModalOpen(true)}
            style={{ marginBottom: 16 }}
          >
            Add Schedule / Sub-Event (เพิ่มกำหนดการ)
          </Button>

          <List
            dataSource={subEvents}
            renderItem={(subEvent) => (
              <List.Item>
              {[
                  <Popconfirm 
                    title="Delete this activity?" 
                    onConfirm={() => handleDeleteSubEvent(subEvent._id)}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button type="text" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                ]}
                <List.Item.Meta
                  avatar={<Badge status="processing" color={subEvent.color} />}
                  title={
                    // (คลิกเพื่อไปดูรายละเอียดของกิจกรรมย่อยได้!)
                    <Link to={`/Easyevent/event/${subEvent._id}`}>
                      {subEvent.title}
                    </Link>
                  }
                  description={`${dayjs(subEvent.startTime).format('MMM D, HH:mm')} - ${dayjs(subEvent.endTime).format('HH:mm')}`}
                />
              </List.Item>
            )}
          />
        </Tabs.TabPane>
        )}

        {/* --- (แท็บ 5: "คอมเมนต์" (Discussion)) --- */}
        <Tabs.TabPane tab={`Discussion (${comments.length})`} key="4">
          <Title level={5}>Post a new comment</Title>
          <Form form={form} onFinish={onCommentSubmit} style={{ marginTop: 16 }}>
            <Form.Item name="text" rules={[{ required: true, message: 'Please write a comment' }]}>
              <Input.TextArea rows={3} placeholder="Share your thoughts or post a location link..." />
            </Form.Item>
            <Form.Item>
              <Button htmlType="submit" loading={commentLoading} type="primary">
                Post Comment
              </Button>
            </Form.Item>
          </Form>
          <Divider />
          
          <Title level={4} style={{ marginTop: 24 }}>Comments</Title>
          {comments.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No comments yet" />
          ) : (
            comments.map(item => (
              <CommentItem 
                key={item._id} 
                comment={item} 
                eventId={id} 
                onCommentAdded={refreshComments} 
              />
            ))
          )}
        </Tabs.TabPane>
      </Tabs>
      
      {/* --- (3. "Modals" (โมดอล)) --- */}
      <Modal
        title="Add a new poll option"
        open={isAddModalOpen}
        onOk={handleAddOption}
        onCancel={() => setIsAddModalOpen(false)}
        okText="Add"
        cancelText="Cancel"
      >
        <Input value={newOptionText} onChange={e => setNewOptionText(e.target.value)} placeholder="Option text" />
      </Modal>

      <Modal
        title="Reset All Votes?"
        open={isResetModalOpen}
        onOk={handleConfirmReset}
        onCancel={() => setIsResetModalOpen(false)}
        okText="Yes, Reset"
        cancelText="Cancel"
        okType="danger"
      >
        <Paragraph>การโหวตทั้งหมดในปัจจุบันจะถูกลบออกอย่างถาวร</Paragraph>
        <Paragraph>จะทำให้สามารถเริ่มการโหวตรอบใหม่ได้</Paragraph>
        <Paragraph type="secondary">การดำเนินการนี้ไม่สามารถย้อนกลับได้</Paragraph>
      </Modal>

      <Modal 
        title="Create Sub-Activity" 
        open={isSubEventModalOpen} 
        onOk={() => subEventForm.submit()} 
        onCancel={() => setIsSubEventModalOpen(false)}
      >
        <Form form={subEventForm} layout="vertical" onFinish={onSubEventSubmit}>
          <Form.Item name="title" label="Activity Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Visit White Temple" />
          </Form.Item>
          
          <Form.Item name="description" label="Details / Description">
            <Input.TextArea rows={3} placeholder="Enter activity details here..." />
          </Form.Item>

          <Form.Item name="dateRange" label="Time" rules={[{ required: true }]}>
            <DatePicker.RangePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
      
    </div>
    
  );
};

export default EventDetailsPage;