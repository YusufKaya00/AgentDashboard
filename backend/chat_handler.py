@app.post("/api/chat")
async def chat(request: ChatRequest):
    agents = StorageManager.get_agents()
    agent = agents.get(request.agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
        
    # Get model to use
    models = StorageManager.get_models()
    model_id = agent.get('model')
    model_data = models.get(model_id)
    
    if not model_data:
        enabled_models = [m for m in models.values() if m.get('enabled')]
        if not enabled_models:
            raise HTTPException(status_code=500, detail="No enabled AI models found")
        model_data = enabled_models[0]

    # Get history, memory, training
    history = StorageManager.get_chat_history(request.agent_id)
    memory = StorageManager.get_memory(request.agent_id)
    
    # Prepare System Prompt
    memory_context = "\n".join([f"- {k}: {v.get('value')}" for k, v in memory.items()])
    system_prompt = f"""Sen bir AI ajanısın. Adın: {agent['name']}.
Rolün ve Görevin: {agent['description']}

ELİNDEKİ ARAÇLAR (TOOLS):
1. `list_files`: Projedeki dosyaları görmek için kullan.
2. `read_file`: Bir dosyayı değiştirmeden önce içeriğini anlamak için oku.
3. `write_file`: Kod yazmak veya güncellemek için kullan.

KURALLAR:
- Eğer bir kod değişikliği yapman istenirse, önce `list_files` ve `read_file` ile durumu incele.
- Değişiklikleri `write_file` aracını kullanarak GERÇEKTEN yap.
- Sadece konuşma, eyleme geç! Claude CLI gibi davran.
- Tüm dosya yolları göreceli (relative) olmalıdır.

HAFIZA (MEMORY):
{memory_context}
"""

    # Format messages for LLM
    llm_messages = [{"role": "system", "content": system_prompt}]
    for msg in history[-10:]: # Son 10 mesajı al
        llm_messages.append({"role": msg["role"], "content": msg["content"]})
    
    llm_messages.append({"role": "user", "content": request.message})
    
    # Save user message to history
    user_msg = {
        "id": str(uuid.uuid4()),
        "agent_id": request.agent_id,
        "role": "user",
        "content": request.message,
        "timestamp": datetime.now().isoformat()
    }
    history.append(user_msg)

    # Call LLM
    try:
        response = await llm_client.call_llm(llm_messages, model_data.get('model_id'))
        
        ai_msg = {
            "id": str(uuid.uuid4()),
            "agent_id": request.agent_id,
            "role": "assistant",
            "content": response["message"],
            "timestamp": datetime.now().isoformat()
        }
        history.append(ai_msg)
        StorageManager.save_chat_history(request.agent_id, history)
        
        # Log activity
        log = ActivityLog(
            id=str(uuid.uuid4()),
            agent_id=request.agent_id,
            type="response",
            message=f"Responded to chat",
            timestamp=datetime.now().isoformat(),
            metadata={"tokens": len(response["message"])}
        )
        await broadcast_activity(log)
        
        return response
    except Exception as e:
        logging.error(f"Chat Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
